# API reference (current implementation)

Base path: `/v1`. JSON errors use `{ "error": { "code": "...", "message": "..." } }`.
Responses include an `x-request-id` header.

## Public endpoints

- `GET /health` — Worker health.
- `GET /openapi.json` — OpenAPI 3.1 document for routes currently implemented in this Worker. It excludes webhook and network-configuration endpoints that are not implemented.
- `GET /networks` — network catalogue and explicit support status. All networks are `PLANNED`; this is not a statement of transaction support.
- `GET /tokens` — enabled token configurations on enabled networks; the local simulator asset is marked `testOnly` and is not a real token.
- `POST /auth/register` — create an account, organization, default test project, and browser session. Requires same-origin `Origin`, valid email, organization name, and a 12–128 character password. Email verification delivery is not implemented.
- `POST /auth/login` — create a browser session. Requires same-origin `Origin`. Failed attempts are limited by email and Cloudflare client IP using persisted D1 attempt records.

## Browser session endpoints

The session cookie is HTTP-only, `SameSite=Lax`, path `/`, lasts seven days, and is `Secure` on HTTPS.
Mutations require a matching `Origin`.

- `GET /auth/me`
- `POST /auth/logout`
- `GET /projects`
- `POST /projects` — `{ "name": "...", "environment": "test" | "live" }`
- `GET /projects/:id` — retrieve a project only if the current user belongs to its organization.
- `PATCH /projects/:id` — rename a project; requires an owner/admin membership and same-origin `Origin`. Environment changes are not allowed.
- `GET /dashboard/overview?projectId=...` — session-authenticated, membership-scoped payment counts and 10 most recent payments. Counts use persisted states only; amounts are not summed across tokens or represented as fiat volume.
- `GET /dashboard/payments?limit=25&offset=0&projectId=...&status=pending&search=...` — session-authenticated, membership-scoped payment listing with pagination, status/project filters, and search by payment ID or order ID.
- `GET /dashboard/payments/:id` — session-authenticated payment detail with persisted event history and matched transaction observations.
- `GET /api-keys`
- `POST /api-keys` — `{ "projectId": "...", "name": "...", "permissions": [...] }`
- `DELETE /api-keys/:id`

An API key secret is returned only once. The database stores its SHA-256 digest; key metadata is safe to list, and `permissions` is returned as an array of scopes. Supported scopes currently include `invoices:read`, `invoices:write`, `transactions:read`, `webhooks:read`, and `webhooks:write`.

Authenticated API-key requests are limited by the `API_RATE_LIMITER` Cloudflare binding (100 requests per 60 seconds per API key). Cloudflare's Worker Rate Limiting API is approximate and region-local; it is not a strict global abuse or billing control. Configure a unique integer `namespace_id` for this Worker in each Cloudflare account.

## API-key endpoints

- `GET /payments?limit=25&offset=0` — project-scoped payment listing; requires `invoices:read`.
- `GET /payments/:id` — retrieve a project-scoped payment; requires `invoices:read`.
- `GET /payments/:id/events?limit=25&offset=0` — retrieve the persisted event timeline for a project-scoped payment; requires `invoices:read`.
- `POST /payments/:id/cancel` — cancel a `created` or `pending` payment; requires `invoices:write`. Repeated cancellation returns the cancelled payment without creating another event. Payments that already have a transfer or are otherwise no longer unpaid cannot be cancelled. A later incoming transfer is still reconciled; cancellation cannot prevent or reverse an on-chain transfer.
- `GET /transactions?limit=25&offset=0&networkId=...` — project-scoped transaction observations; requires `transactions:read`.
- `GET /transactions/:hash?networkId=...` — retrieve observations for a hash. `networkId` is optional, but use it where hashes may be shared across networks. Only observations matched to payments in the API key's project are returned.
- `GET /invoices?limit=25&offset=0` — project-scoped invoice listing; requires `invoices:read`.
- `GET /invoices/:id` — retrieve an invoice within the API key's project.
- `POST /invoices` — create an invoice for a configured, enabled asset and verified adapter. Requires `invoices:write` and an `Idempotency-Key`. Amounts are decimal strings.
- `POST /invoices/:id/expire` — expire a pending invoice; emits a persisted `payment.expired` event.

Invoice creation is deliberately unavailable for all actual networks until an adapter is implemented and independently added to the verified capability registry. It is currently available only for the test-only `local-test-simulator` asset with a test API key. The simulator creates synthetic records and has no blockchain or monetary value.

### Local test simulator

- `POST /test/simulate-transfer` — requires a test API key with `invoices:write`, an `Idempotency-Key`, and a local simulator invoice. Body: `{ "invoiceId": "pay_...", "amount": "25.00" }`.
- Simulated observations and transaction API records are explicitly marked `simulated`; never use this route or its records as proof of a real transfer.
- Exact payments become `confirmed` only inside this simulator. Real-chain status still requires adapter-verified observations and confirmation tracking.
- Successful simulator responses use `{ "data": { "transactionHash": "sim_...", "simulated": true, "invoice": { ... } } }`. Repeating a transfer with the same idempotency key and details returns HTTP 200 with the same response shape; reusing the key with different details returns 409.
- Concurrent updates can return 409 `invoice_changed`; retry with a new transfer idempotency key after retrieving the invoice. The simulator never treats a conflict or internal processing error as a successful transfer.

## Not implemented yet

Webhook management/delivery, email verification, password reset, organization/team management, strict global rate limiting, and real blockchain monitoring are not implemented. No real chain can create an invoice yet. Do not treat this API as production-ready.

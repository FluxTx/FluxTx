# FluxTx

Open-source, non-custodial payment infrastructure for monitoring and reconciling blockchain payments.

FluxTx is under active development and is **NOT PRODUCTION READY**. No blockchain adapter has passed the real-network verification required for `SUPPORTED` status; all listed networks are currently `PLANNED`. This repository includes a TypeScript domain foundation, Cloudflare Worker API, D1 schema, and initial browser session/API-key workflows. It does not yet create or verify blockchain payments. Email verification delivery and password reset also require an email integration that is not implemented.

## Development

Requirements: Node.js 20+ and npm. Docker is optional and is not available in the current development environment.

```powershell
npm install
npm test
npm run typecheck
```

`npm test` includes Miniflare D1 integration tests that apply the checked-in migrations and verify auth/session behavior, project isolation, API-key revocation, invoice idempotency, transaction reads, and the test simulator lifecycle.

Start a local API and dashboard:

```powershell
# Apply the D1 migrations once.
npm run db:migrate:local --workspace @fluxtx/api

# Configure the dashboard's server-side API proxy.
Copy-Item apps/dashboard/.env.example apps/dashboard/.env.local

# Terminal 1
npm run dev --workspace @fluxtx/api

# Terminal 2
npm run dev --workspace @fluxtx/dashboard
```

Open the dashboard at `http://localhost:3000`. Registration and login use the local API; the first registered account receives its initial organization and project. The dashboard provides authentication, a data-backed overview, project management, API-key creation/revocation, and persisted payment listing/details. It does not yet include the complete merchant-management feature set.

The API exposes `GET /v1/health`, `GET /v1/networks`, registration/login, browser sessions, organization/project setup, API key issuance/revocation, project-scoped persisted invoices, and a session-authenticated dashboard overview. The networks response is a capability catalogue, not a claim that those chains can process payments.

Invoice creation is currently limited to the clearly labeled test simulator, which produces synthetic records with no monetary value; actual chain invoice creation is blocked until a verified adapter exists. See [API.md](./API.md) for implemented routes and explicit gaps.

The current machine-readable API contract is available at `GET /v1/openapi.json`.

## Project layout

- `apps/api` — Hono API for Cloudflare Workers and D1.
- `apps/dashboard` — Next.js dashboard foundation and same-origin API proxy.
- `packages/core` — exact amount conversion, payment-state transitions, and network support metadata.
- `IMPLEMENTATION_PLAN.md` — current architecture, phase status, and next steps.
- `TASKS.md` — implementation checklist and known limitations.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design boundaries and current scope.

## Security and custody

FluxTx is designed to monitor merchant-controlled addresses; it must not request seed phrases or private keys. Until transaction verification, matching, webhook signing, and project isolation are implemented and reviewed, this code must not be used to process production payments.

## License

MIT. See [LICENSE](./LICENSE).

# FluxTx implementation plan

## Current phase

**Phase 2 / Phase 10 — UI foundation and merchant dashboard: in progress.** The Next.js/React dashboard includes registration/login, a restricted same-origin API proxy, persisted overview and payment list/detail views, project management, and project-scoped API-key creation/revocation with one-time secret display. The API's initial invoice lifecycle and simulator are implemented, but the platform is not production-ready; webhook/network/settings screens, real chain processing, email workflows, webhook delivery, and production rate limiting remain.

## Completed in this session

- Inspected the repository: it was empty apart from this plan, task list, and `CLAUDE.MD`; no Git metadata was present.
- Read the FluxTx product specification and the official Karpathy-inspired guidelines.
- Read official Animate UI installation/React docs, shadcn Next.js, Tailwind Next.js, and Cloudflare D1 binding docs.
- Chose npm workspaces with a runtime-neutral domain package and a Hono Worker API.
- Added exact amount conversion, the payment-state transition guard, explicit planned-only network metadata, Worker health/catalogue routes, and initial D1 schema.
- Installed dependencies; all current unit tests and TypeScript checks pass.
- Applied the initial migration successfully against local D1 (27 SQL commands).
- Added the auth/session migration and exercised account registration, session lookup, project access, API-key creation, payment-list authorization, revocation, and origin validation against local Wrangler/D1.
- Verified both migrations on a fresh isolated D1 database using `wrangler d1 migrations apply`.
- Smoke-tested duplicate registration, invalid credentials, successful login/logout, cross-organization project isolation, and rejection of revoked keys.
- Added invoice creation/list/retrieval/expiration, idempotency, a test-only simulated transfer route, exact base-unit accounting, and revision claims for concurrent payment updates.
- Applied migrations `0001`–`0004` to a clean isolated D1 store and verified the Worker over HTTP: concurrent partial transfers, retry behavior, exact confirmation, overpayment, repeated expiration, and a late transfer after expiration.
- Queried persisted D1 records to verify each expected event was emitted once, including a single `payment.expired` event, and revision claims matched accepted transfers.
- Added a Miniflare D1 integration test that applies the real migrations and exercises registration, project-scoped API keys, invoice idempotency, cross-project isolation, concurrent simulated transfers, confirmation, overpayment, expiration, revocation, and persisted event/observation counts.
- The integration test exposed and fixed inconsistent simulator idempotency responses and clarified expected concurrent revision conflicts versus internal processing errors.
- Added `GET /v1/openapi.json` with OpenAPI 3.1 schemas for implemented routes only; it explicitly documents simulator-only payment creation and leaves unimplemented webhook APIs out.
- Configured the Cloudflare Worker Rate Limiting binding for 100 authenticated API-key requests per minute and covered allowed/rejected responses in the D1 integration flow. The limit is approximate and per Cloudflare location, not a strict global control.
- Added paginated, optionally network-filtered transaction observation listing and hash lookup, guarded by `transactions:read` and project scope; simulator observations identify themselves explicitly. D1 integration coverage verifies permissions and cross-project isolation.
- Added project-scoped `GET /payments/:id` and `POST /payments/:id/cancel`; cancellation is conditional on the current payment revision, records a single persisted cancellation event, is idempotent on retry, and rejects payments that are no longer unpaid.
- Verified that a transfer arriving after cancellation is still reconciled as an underpayment, rather than silently discarded.
- Added paginated `GET /payments/:id/events`, scoped to the owning project and backed by the persisted payment event timeline.
- Added `GET /tokens` from enabled D1 configurations; simulator tokens are explicitly labeled test-only, and all live network support remains unverified.
- Added membership-scoped project retrieval and owner/admin project rename with same-origin mutation checks and duplicate-name handling.
- Added a session-authenticated dashboard overview that queries persisted payments within the user's organization memberships and does not invent or combine fiat volume across tokens.
- Added session-authenticated, membership-scoped payment listing and detail endpoints with pagination, status/project filters, ID/order search, persisted events, and matched observations.
- Updated OpenAPI and API documentation for payment retrieval/cancellation, and added integration checks for permission enforcement and project isolation.
- Added the initial Next.js dashboard, login/registration forms, React Query providers, a restricted same-origin API proxy, responsive theme tokens, and a persisted-data overview that labels unverified networks as planned.
- Added local dashboard configuration and documented how to run it with the Worker API.
- Fixed dashboard type errors by declaring React children explicitly and targeting ES2020 for exact base-unit formatting.
- Added API-key management in the dashboard: project selection, validated scopes, one-time secret display/copy, metadata listing, and revocation.
- Corrected API-key list responses to deserialize and validate permission scopes as an array; added integration assertions for the response contract.
- Added project management in the dashboard using membership-scoped project listing, project creation, and owner/admin rename APIs; live projects are explicitly described as unable to process real transfers.
- Added paginated/filterable payments view and payment detail timeline from persisted state; transaction observations include match status, confirmations, finality, amounts, and addresses.
- Latest validation: 23 core and 10 API tests pass, repository TypeScript checks pass, and dashboard lint/build pass. Next.js builds `/payments/[id]` with a Suspense boundary for runtime route params.

## Decisions and constraints

- D1 is authoritative; exact base-unit amounts are stored as decimal text because the D1 Worker binding does not support JavaScript `bigint`.
- Chain catalogue names do not imply support. Every chain remains `PLANNED`.
- The Worker must not become a long-running indexer; use bounded scheduled/queued work or a separately deployed hybrid indexer.
- Docker is unavailable in this environment. No frontend or live chain credentials/data source are available.
- Initialized Git in the confirmed project root; no remote or commit was created.

## Modified files

- Root: `package.json`, `package-lock.json`, `.gitignore`, `tsconfig.base.json`, `README.md`, `API.md`, `ARCHITECTURE.md`, `LICENSE`; initialized `.git/`.
- Core: `packages/core/**`.
- API: `apps/api/**`.
- Continuity: `IMPLEMENTATION_PLAN.md`, `TASKS.md`.

## Known issues and blockers

- The dashboard currently has auth, overview, API-key, project, payment list, and payment detail views; dedicated transaction, webhook, network, and organization settings screens are not implemented.
- No real blockchain adapter/indexer, webhook delivery, SDKs, or production deployment support exists yet.
- Authentication does not yet provide email verification or password reset; no email provider is configured.
- Invoice creation is currently restricted to the test simulator, which produces synthetic records with no monetary value. No chain is verified or enabled for real payments.
- Automated D1 integration coverage includes browser sessions, API-key lifecycle and project isolation, plus simulator invoice/transaction flows; real-chain and webhook integration suites remain incomplete.
- Expiration is exposed as an API operation; a scheduled expiration/reconciliation worker is not implemented.
- `npm audit` after adding dashboard dependencies reported 13 development-dependency issues (2 low, 11 moderate), primarily in the ESLint/minimatch tree. Do not apply a force fix that downgrades Next.js; resolve with compatible dependency updates.

## Next steps

1. Complete dashboard transaction/webhook/settings flows and add browser interaction coverage without inventing production data.
2. Define an explicit email-provider integration before enabling verification and password-reset flows.
3. Implement and independently verify a real chain adapter against testnet data before enabling real-chain invoices.
4. Add indexer confirmation/reorganization handling, payment reconciliation, and signed/retried webhooks.
5. Continue the remaining phases and update this plan and `TASKS.md` after each phase.
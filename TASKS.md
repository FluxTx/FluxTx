# FluxTx task status

## Done

- [x] Inspect the existing repository and read `CLAUDE.MD`.
- [x] Read official coding, Animate UI, shadcn, Tailwind, and D1 documentation.
- [x] Establish npm workspace, TypeScript settings, and initial architecture.
- [x] Implement exact decimal/base-unit conversion with tests.
- [x] Implement explicit payment state transitions with tests.
- [x] Add planned-only network catalogue and Hono health/catalogue routes with tests.
- [x] Define initial normalized D1 schema and indexes.
- [x] Document current capability and security limitations.
- [x] Install dependencies; pass current unit tests and TypeScript checks.
- [x] Apply the initial D1 migration locally (27 statements).
- [x] Initialize Git in the confirmed project root without adding a remote or committing.

## In progress

- [x] Scaffold the Next.js 16/React 19 dashboard with responsive theme tokens, React Query, Animate UI, and Motion.
- [x] Add login/registration forms, the persisted-data dashboard overview, and a restricted same-origin API proxy.
- [x] Implement dashboard API-key creation, one-time secret display, listing, and revocation.
- [x] Implement dashboard project listing/creation/rename with explicit environment capability messaging.
- [x] Add membership-scoped, session-authenticated payment list/detail APIs with search, filters, pagination, event history, and matched observations.
- [x] Implement dashboard payment listing/filtering/pagination and persisted payment detail timeline/transaction observations.
- [x] Return API-key permissions as validated JSON arrays and cover the contract in D1 integration tests.
- [x] Add dashboard local API configuration and setup instructions.
- [x] Pass dashboard lint/build and repository typechecking; pass core and API suites (23 and 10 tests).
- [ ] Complete dashboard transaction/webhook/network/settings workflows and validate browser interactions.
- [x] Add password-hashed account registration/login, seven-day HTTP-only sessions, CSRF origin checks, failed-login limits, organization/project bootstrapping, API-key issuance/revocation, and project-scoped payment listing.
- [x] Smoke-test auth/session/project/API-key lifecycle against Wrangler and local D1 over HTTP.
- [x] Implement persisted test-only invoice creation, retrieval/listing/expiration, idempotency, and simulated transfers using exact base-unit amounts.
- [x] Add revision claims to avoid duplicate payment updates under concurrent transfers.
- [x] Smoke-test clean D1 migrations `0001`–`0004`, concurrent transfers, confirmation, overpayment, repeated expiration, and late payments; verify event counts in D1.
- [x] Add Miniflare D1 integration coverage for migrations, registration/login/logout, origin protection, account/project isolation, API-key revocation and secret redaction, invoice idempotency, concurrent transfers, state transitions, and persisted event counts.
- [x] Normalize simulator transfer replay responses and distinguish revision races from internal processing errors.
- [x] Expose OpenAPI 3.1 JSON for implemented routes and test that unimplemented webhook/transaction APIs are not advertised.
- [x] Configure approximate Cloudflare API-key rate limiting (100 requests/minute/key), test 429 responses, and document its region-local limitations.
- [x] Implement project-scoped transaction observation list/detail APIs with transaction permission checks and simulator labeling.
- [x] Add project-scoped payment retrieval and revision-guarded cancellation with a single persisted event and idempotent retry handling.
- [x] Expose the persisted payment event timeline with pagination and project scoping.
- [x] Expose enabled token configuration with explicit simulator-only labeling.
- [x] Add membership-scoped project retrieval and owner/admin project rename endpoints.
- [x] Add a session-authenticated, membership-scoped dashboard overview backed by persisted payment data.
- [ ] Complete API phase: email verification/reset provider integration, strict global rate limiting, and real verified chain capability.

## Pending

- [ ] Phase 2: finish the dashboard foundation and accessibility/interaction coverage.
- [ ] Phase 3: email verification/password reset, organization/team management, full RBAC and secure sessions.
- [ ] Phase 4: payment API, hashed API keys, idempotency, validation, OpenAPI.
- [ ] Phase 5: adapter interfaces and test/EVM implementations with verified parsing.
- [ ] Phase 6: indexer, persistent checkpoints, confirmation/reorg handling.
- [ ] Phase 7: payment matching and reconciliation.
- [ ] Phase 8: signed/retried webhooks and SSRF controls.
- [ ] Phase 9: hosted checkout.
- [ ] Phase 10: merchant dashboard.
- [ ] Phase 11: TypeScript, Python, PHP, and Go SDKs.
- [ ] Phase 12: Cloudflare and self-hosted deployment options.
- [ ] Phase 13: integration, security, and end-to-end testing.
- [ ] Phase 14: release documentation, CI, and community files.

## Outstanding bugs and risks

- The simulator flow is persisted and test-only; there is no real end-to-end blockchain payment flow. This is not production-ready.
- `npm audit` reported 13 development-dependency issues after dashboard dependency installation; avoid force-fixing by downgrading Next.js.
- No chain is implemented or verified; all are honestly labeled `PLANNED`.
- Docker is unavailable in the current environment.
- Authentication does not yet verify email or support password recovery; avoid production deployment until those controls are in place.
- Invoice expiration has no scheduled worker, and webhooks are not implemented.
- D1 integration tests cover auth/session and project-scoped simulator flows, not real blockchain or webhook integrations.
- Cloudflare rate-limit counters are approximate per data center and must not be used as a strict global billing or security boundary.
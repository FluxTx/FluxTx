# FluxTx architecture

## Product boundaries

FluxTx is intended to provide a merchant API, dashboard and hosted checkout backed by a payment engine, an independent blockchain indexer, persistent transaction observations, and signed webhook delivery. It is non-custodial: funds should go directly to merchant-controlled addresses, and FluxTx should never request seed phrases or private keys.

## Planned deployment topology

```text
Merchant integration
        |
        v
Cloudflare Worker API ---- D1 (authoritative records)
        |                         ^
        v                         |
Payment event queue <---- Blockchain indexer
        |
        v
Webhook delivery worker ---- Merchant endpoint
```

The Worker API handles short-lived requests. Continuous scanning and backfill belong in a separately deployable indexer for the hybrid deployment; Cron Triggers and Queues can support bounded Cloudflare-native processing. Workers are not treated as always-running daemons.

## Repository modules

- `packages/core` is runtime-neutral. Amounts are represented as `bigint` in application logic and decimal strings at persistence/API boundaries because D1's binding does not accept JavaScript `bigint`.
- `apps/api` is a Hono Worker. D1 is authoritative; cache services, if added, must not become the source of truth for payments.
- `apps/api/migrations` contains normalized D1 schema and indexes.
- The frontend, indexer, SDKs, and delivery consumers remain planned work; they are not represented by mock integrations.

## Payment integrity decisions

- User-provided amounts are decimal strings, parsed into integer base units. Floating-point arithmetic is not used.
- Payment state changes go through an explicit transition table.
- Transaction observations are separate from invoices and matched through a dedicated relation, allowing duplicate detection and ambiguous-match handling.
- Transaction hashes are unique per network, not globally.
- Network support is a verified capability, not a name in a catalogue. Every network remains `PLANNED` until its adapter and real-data verification meet the project policy.

## Current implementation status

Implemented: TypeScript workspace, exact amount helpers, payment status transition guard, Hono health/catalogue/OpenAPI routes, D1 schema and migrations, password-hashed account registration/login, HTTP-only database-backed sessions, origin checks, failed-login limits, organization/project bootstrapping, API-key hashing/issuance/revocation, project-scoped invoice APIs, project-scoped transaction observation list/detail APIs, idempotent test invoice creation, and a test-only simulated transfer flow. The simulator uses D1 revision claims and transactional batches to guard payment updates and persist observations/events. Authenticated API-key traffic uses a Cloudflare Rate Limiting binding (100 requests/minute/key); its documented consistency is approximate and region-local. A Miniflare D1 integration test applies the checked-in migrations and verifies simulator persistence, idempotent replay, project isolation, and rate-limit responses.

Not implemented: email verification delivery, password reset, full organization/team management, strict global rate limiting, real chain adapters, indexer, confirmation/reorganization tracking, automated expiration, webhook delivery/SSRF protections, checkout, dashboard, SDKs, Docker deployment, broader auth/real-chain/webhook integration suites, or production observability. The test simulator is not a blockchain adapter and has no monetary value.

The clean D1 migration and simulator HTTP flow are automatically exercised in Miniflare, including concurrent transfer requests and persisted event counts. No production readiness or real blockchain support is claimed.

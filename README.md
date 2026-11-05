# FluxTx

<div align="center">
  <img src="assets/FluxTx-banner.png" alt="FluxTx — One API. Every Chain. Payments in Motion." width="100%" />


  **One API. Every Chain. Payments in Motion.**

  Open-source, non-custodial infrastructure for monitoring and reconciling blockchain payments.

  <p>
    <img src="https://img.shields.io/badge/status-alpha-orange?style=flat-square" alt="Alpha" />
    <img src="https://img.shields.io/badge/production-not%20ready-red?style=flat-square" alt="Not Production Ready" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
  </p>
</div>

---

> [!WARNING]
> **FluxTx is under active development and is NOT PRODUCTION READY.**
>
> No blockchain adapter has passed real-network verification. All listed networks are currently `PLANNED`. The current implementation does not create or verify real blockchain payments. Simulator transactions are synthetic and have no monetary value.

## Overview

FluxTx is an open-source, developer-first payment infrastructure project designed to simplify blockchain payment monitoring and reconciliation through a unified API.

Current foundations include:

- TypeScript payment domain and state management.
- Hono API running on Cloudflare Workers.
- Cloudflare D1 database and migrations.
- User authentication and browser sessions.
- Project and API key management.
- Initial payment lifecycle and test simulator.
- Next.js merchant dashboard.
- OpenAPI 3.1 specification.

Email verification delivery and password reset require an email integration that is not yet implemented.

## Development

**Requirements:** Node.js 20+ and npm.

```powershell
npm install
npm test
npm run typecheck
```

Integration tests use Miniflare D1 to verify migrations, authentication, project isolation, API key revocation, invoice idempotency, transaction reads, and simulator workflows.

### Run locally

```powershell
# Apply local D1 migrations
npm run db:migrate:local --workspace @fluxtx/api

# Configure dashboard API proxy
Copy-Item apps/dashboard/.env.example apps/dashboard/.env.local
```

Start the API:

```powershell
npm run dev --workspace @fluxtx/api
```

Start the dashboard in another terminal:

```powershell
npm run dev --workspace @fluxtx/dashboard
```

Open **http://localhost:3000**.

The first registered account receives its initial organization and project.

## API

Current endpoints and capabilities include:

- `GET /v1/health`
- `GET /v1/networks`
- Registration and login.
- Browser session management.
- Organization and project management.
- API key issuance and revocation.
- Project-scoped payment listing and retrieval.
- Test-only invoice and transaction simulation.
- `GET /v1/openapi.json`

The network catalogue describes planned capabilities, not verified blockchain support.

See [API.md](./API.md) for implemented routes and limitations.

## Project Structure

| Directory | Description |
|---|---|
| `apps/api` | Hono API, Cloudflare Workers and D1 |
| `apps/dashboard` | Next.js merchant dashboard |
| `packages/core` | Payment domain, exact amounts and network metadata |

Additional documentation:

- [Architecture](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Development Tasks](./TASKS.md)

## Roadmap

- Real blockchain adapters and testnet verification.
- Transaction indexing and confirmation handling.
- Payment reconciliation.
- Signed webhooks and retry handling.
- Email verification and password recovery.
- Developer SDKs.
- Hosted checkout.
- Complete merchant dashboard.

Networks will only be marked `SUPPORTED` after implementation and real-network verification.

## Security & Custody

FluxTx is designed to monitor merchant-controlled addresses without requesting seed phrases or private keys.

Until transaction verification, matching, webhook signing, and project isolation have been fully implemented and reviewed, do not use this software to process production payments.

## Contributing

Contributions, bug reports, documentation improvements, and technical discussions are welcome.

Please review the repository issues and contribution guidelines before submitting a pull request.

## License

Released under the [MIT License](./LICENSE).

---

<div align="center">
  **FluxTx — Payments in Motion.**
</div>
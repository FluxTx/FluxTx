# FluxTx — The Open-Source Multi-Chain Payment Infrastructure

## MASTER DEVELOPMENT PROMPT

You are an elite full-stack engineering team consisting of:

- Principal software architect
- Senior React and TypeScript engineer
- Blockchain infrastructure engineer
- Cloudflare Workers specialist
- UI/UX designer
- Application security engineer
- DevOps engineer
- Open-source community maintainer

Your mission is to design, develop, test, document, and prepare for release **FluxTx**, a production-oriented, open-source, self-hostable blockchain payment infrastructure inspired by the developer experience of PayOS.

Do not build merely a landing page, frontend prototype, or mock dashboard.

Build a complete, functional platform that allows developers and businesses to accept cryptocurrency payments, automatically detect incoming blockchain transfers, verify transactions, reconcile payments, and receive reliable webhook notifications through a unified API.

The project must be suitable for public release on GitHub and designed to attract developers through excellent documentation, practical utility, extensibility, security, and ease of self-hosting.

---

# 1. PROJECT IDENTITY

## Brand

Project name: FluxTx

GitHub repository: `fluxtx`

Recommended repository name: `fluxtx`

Tagline:

**One API. Every Chain. Payments in Motion.**

Alternative tagline:

**Open-source payment infrastructure for every blockchain.**

Product category:

Open-source, non-custodial, multi-chain payment API and blockchain transaction monitoring infrastructure.

License: MIT.

Primary audience:

- SaaS developers
- E-commerce platforms
- Web3 applications
- Subscription services
- Digital product sellers
- Online marketplaces
- Open-source developers
- Businesses accepting cryptocurrency payments

## Brand Positioning

FluxTx is not simply a cryptocurrency checkout page.

It is a developer-first payment infrastructure that provides:

- Unified blockchain payment APIs
- Automatic transaction detection
- Payment verification
- Payment reconciliation
- Signed webhooks
- Hosted checkout
- Merchant dashboard
- Multi-chain monitoring
- Self-hosted deployment
- Cloudflare-based infrastructure

The core differentiator is:

**One integration to detect, verify, and reconcile blockchain payments across multiple networks.**

Do not claim that FluxTx is affiliated with PayOS, Stripe, or any other payment provider.

---

# 2. REQUIRED DEVELOPMENT WORKFLOW

Before writing code:

1. Inspect the entire existing repository.
2. Identify the existing framework, dependencies, project structure, and functionality.
3. Read the official documentation for the required technologies.
4. Create an architecture and implementation plan.
5. Identify infrastructure limitations and security risks.
6. Define database schemas and API contracts.
7. Implement the application incrementally.
8. Run tests after each major implementation phase.
9. Fix all discovered errors before moving forward.
10. Keep documentation synchronized with actual functionality.

If the repository is empty, initialize a complete monorepo.

If the repository already contains code, preserve working functionality and avoid unnecessary rewrites.

Do not stop after producing a plan.

Do not ask for confirmation after every implementation phase.

Make reasonable engineering decisions independently and document important trade-offs.

If a feature requires unavailable credentials or external infrastructure, implement the integration interface, local simulator, configuration flow, and clear setup instructions.

Never silently replace real functionality with fake data.

# REQUIRED AI CODING SKILL — KARPATHY GUIDELINES

Before implementing FluxTx, read and apply the official Karpathy-inspired coding guidelines:

Repository:
https://github.com/multica-ai/andrej-karpathy-skills

Official project guidelines:
https://github.com/multica-ai/andrej-karpathy-skills/blob/main/CLAUDE.md

Skill file:
https://github.com/multica-ai/andrej-karpathy-skills/tree/main/skills/karpathy-guidelines

If the skill is available in the current coding environment, activate and follow it.

If it is not installed, read the repository's official guidelines and apply them to the current task. Do not assume that the skill is installed.

## Mandatory Principles

### 1. Think Before Coding
- Inspect the existing code and architecture before making changes.
- Identify assumptions, ambiguities, and potential risks.
- Ask for clarification only when a critical decision cannot be reasonably inferred.
- Explain important trade-offs before choosing complex architecture.
- Never blindly follow an approach that introduces unnecessary complexity.

### 2. Simplicity First
- Implement the simplest solution that satisfies the requirements.
- Avoid unnecessary abstractions, dependencies, and frameworks.
- Do not build speculative features.
- Prefer readable, maintainable code over clever solutions.
- Keep blockchain adapters modular without overengineering the abstraction layer.

### 3. Surgical Changes
- Modify only files relevant to the current task.
- Preserve existing working functionality.
- Do not perform unrelated refactoring.
- Do not delete pre-existing code unless explicitly required.
- Remove only unused code introduced by your own changes.
- Keep changes small, reviewable, and directly connected to the requested feature.

### 4. Goal-Driven Execution
For every implementation phase:

1. Define concrete success criteria.
2. Implement the smallest complete solution.
3. Run relevant tests and checks.
4. Inspect the results.
5. Fix failures.
6. Repeat until the criteria are satisfied.
7. Report verified results and remaining limitations.

Do not claim a feature works unless it has been tested or its limitations are clearly stated.

## FluxTx-Specific Application

Apply these principles to:
- React and Animate UI components
- Cloudflare Workers and D1 architecture
- Blockchain adapters and indexers
- Payment matching and confirmation logic
- Webhook delivery and security
- SDKs and API endpoints
- Database migrations
- Deployment configuration

For blockchain payment logic, prioritize correctness and verifiable transaction state over implementation speed.

For frontend work, avoid unnecessary component rewrites and animations.

For infrastructure work, do not introduce additional services unless they solve a demonstrated requirement.

The final implementation must be simple, secure, testable, and maintainable while satisfying the complete FluxTx specification.

These guidelines supplement the FluxTx requirements; they do not replace or remove any required product features.

### CONTEXT MANAGEMENT & IMPLEMENTATION CONTINUITY

- **Context Limit Recovery:** If the context window is running low, the agent MUST save the current implementation progress before stopping or compacting context.
  - Update `IMPLEMENTATION_PLAN.md` with completed phases, current progress, architectural decisions, modified files, known issues, blockers, and the exact next steps.
  - Update `TASKS.md` with completed tasks, pending tasks, in-progress tasks, and outstanding bugs.
  - Clearly mark the current phase and the next unfinished phase.
  - When continuing in a new context or session, read `IMPLEMENTATION_PLAN.md` and `TASKS.md` first, inspect the existing codebase, and resume from the first unfinished task.
  - NEVER restart the project, overwrite completed work, or assume unfinished work is complete.
  - Keep both files updated throughout development, not only when context is nearly exhausted.

### VERIFIED BLOCKCHAIN SUPPORT POLICY

- **No Fake Blockchain Support:** A blockchain must NEVER be advertised as officially supported merely because its name appears in the architecture, documentation, configuration, UI, or roadmap.
- A blockchain can be marked **Supported** only when:
  1. Its adapter has been fully implemented.
  2. Transaction and event parsing work with real blockchain data.
  3. Native-token and applicable token transfers are correctly detected.
  4. Confirmations, finality, failed transactions, and reorganization handling are implemented where applicable.
  5. Payment matching and idempotency have been tested.
  6. Automated tests pass, including integration tests against a real testnet or a verified blockchain data source.
  7. The adapter has been reviewed and its limitations are documented.
- Use explicit support statuses:
  - `SUPPORTED`: Fully implemented and verified through real integration testing.
  - `BETA`: Implemented but has known limitations or incomplete verification.
  - `IN_PROGRESS`: Development is ongoing.
  - `PLANNED`: Roadmap only; not implemented.
  - `UNSUPPORTED`: Not available.
- The dashboard, API documentation, SDKs, README, landing page, and supported-chain list MUST display consistent, truthful statuses.
- Never fabricate test results, transaction support, RPC compatibility, or production readiness.
- If a blockchain has not passed the required verification, clearly label it as experimental or planned instead of claiming support.
- Only promote a blockchain to `SUPPORTED` after the required implementation and tests have actually passed.

---

# 3. MANDATORY FRONTEND TECHNOLOGY STACK

Use the following frontend stack:

- React 19
- TypeScript
- Next.js
- Tailwind CSS
- shadcn/ui
- Animate UI
- Motion
- Lucide React
- Zod
- TanStack Query where appropriate
- React Hook Form where appropriate

## Animate UI

Official website:

https://animate-ui.com/

Official documentation:

https://animate-ui.com/docs

Installation documentation:

https://animate-ui.com/docs/installation

React documentation:

https://animate-ui.com/docs/react

Use Animate UI as the primary animation and interaction component library.

Before implementation:

- Read the official installation documentation.
- Inspect the available React components.
- Use the current supported installation commands.
- Follow the official component usage patterns.
- Avoid obsolete APIs.
- Verify compatibility with the selected React and Next.js versions.

Use Animate UI components for:

- Animated buttons
- Dialogs
- Drawers
- Navigation transitions
- Tabs
- Tooltips
- Toast notifications
- Progress indicators
- Loading states
- Animated text
- Number counters
- Hover interactions
- Payment status transitions
- Checkout success animations
- Dashboard interactions

Use Motion for custom animations when Animate UI does not provide the required functionality.

Do not unnecessarily install multiple competing animation libraries.

## UI Design Principles

Create a premium developer-tool interface inspired by the quality and usability of:

- Stripe Dashboard
- Linear
- Vercel
- Modern developer infrastructure products

Do not copy their branding or exact layouts.

Design characteristics:

- Clean and minimal
- Professional
- High information density without clutter
- Excellent typography
- Consistent spacing
- Subtle borders
- Clear visual hierarchy
- Responsive layouts
- Accessible components
- Smooth but restrained motion

Support:

- Dark mode
- Light mode
- System theme
- Mobile layouts
- Tablet layouts
- Desktop layouts
- Keyboard navigation
- Screen readers
- Reduced-motion preferences

Avoid excessive gradients, unnecessary glass effects, oversized cards, constant animations, and distracting visual elements.

The interface must feel like a real developer infrastructure product.

---

# 4. PRODUCT ARCHITECTURE

Build FluxTx as a modular, event-driven system.

Core components:

1. Merchant Dashboard
2. Hosted Checkout
3. REST API
4. Payment Processing Engine
5. Blockchain Indexer
6. Blockchain Adapter Layer
7. Transaction Verification Engine
8. Webhook Delivery System
9. Authentication and Authorization
10. Database and Persistence Layer
11. Cloudflare Infrastructure
12. SDKs
13. Documentation Portal
14. Local Development Simulator

Recommended architecture:

```text
Merchant Application
        |
        v
     FluxTx SDK
        |
        v
  Cloudflare API
        |
        v
 Payment Processing Engine
        |
        +--------------------+
        |                    |
        v                    v
   D1 Database          Payment Checkout
        |
        v
 Blockchain Indexer
        |
        v
 Blockchain Adapters
        |
        v
 Ethereum / BNB / Base / TRON / Solana
        |
        v
 Transaction Verification
        |
        v
 Payment Matching Engine
        |
        v
 Payment State Machine
        |
        v
 Cloudflare Queues
        |
        v
 Webhook Delivery System
        |
        v
 Merchant Application
```

The architecture must separate:

- API request processing
- Blockchain monitoring
- Transaction verification
- Payment matching
- Webhook delivery
- Dashboard presentation

Avoid tightly coupling blockchain RPC logic directly to frontend or payment API routes.

---

# 5. BLOCKCHAIN NETWORK SUPPORT

Implement a modular adapter architecture that allows new blockchain networks to be added without rewriting the payment engine.

## Initial EVM Networks

- Ethereum
- BNB Smart Chain
- Polygon
- Arbitrum
- Optimism
- Base
- Avalanche C-Chain

## Initial Non-EVM Networks

- TRON
- Solana

## Future Network Adapter

- Bitcoin

Bitcoin support should be implemented as a separate adapter with its own transaction model, confirmation tracking, and UTXO handling.

Do not force Bitcoin into an EVM-compatible architecture.

## Asset Support

Support:

- Native blockchain assets
- ERC-20 tokens
- TRC-20 tokens
- SPL tokens

Initial token targets:

- USDT
- USDC

Allow administrators to configure additional supported tokens.

Each token configuration must include:

- Token symbol
- Token name
- Network
- Contract or mint address
- Decimals
- Explorer URL
- Enabled status
- Confirmation requirements

Never assume that a token symbol represents the same asset across different networks.

Never hardcode unverified token addresses.

Provide token configuration validation and documentation.

## Blockchain Adapter Interface

Create a common adapter interface supporting:

- Network metadata
- Latest block height
- Block retrieval
- Transaction retrieval
- Native transfer detection
- Token transfer detection
- Transaction receipt verification
- Confirmation count
- Finality status
- Address validation
- Transaction explorer URL
- Historical scanning
- Reorganization detection
- RPC health checks

Each adapter must implement the common interface while retaining network-specific logic.

---

# 6. BLOCKCHAIN INDEXER

Build a dedicated blockchain indexer service.

The indexer is responsible for detecting blockchain transactions independently of the public API.

## Core Features

- Monitor configured networks
- Track block heights
- Fetch blocks and relevant logs
- Detect incoming transfers
- Decode token transfer events
- Identify recipient addresses
- Persist transaction observations
- Match transactions to payment invoices
- Track confirmation progress
- Detect blockchain reorganizations
- Resume processing after restart
- Backfill historical blocks
- Rescan configurable ranges
- Prevent duplicate processing
- Support configurable polling intervals
- Monitor RPC health

## Reliability

Implement:

- Persistent block checkpoints
- RPC provider failover
- Retry with exponential backoff
- Rate-limit handling
- Timeout handling
- Circuit breakers
- Provider health tracking
- Duplicate transaction protection
- Idempotent processing
- Reorganization recovery
- Structured logging
- Graceful shutdown

For EVM networks:

- Use logs and indexed transfer events where possible.
- Avoid scanning every transaction unnecessarily.
- Verify transaction receipts.
- Verify successful transaction execution.
- Validate token contract addresses.
- Track block hashes and parent hashes.
- Handle removed logs and chain reorganizations.

For TRON:

- Use network-specific transaction and TRC-20 event parsing.
- Validate transaction success and token contract.
- Track confirmations according to network requirements.

For Solana:

- Parse native transfers and SPL token transfers.
- Verify transaction execution status.
- Handle commitment levels.
- Track signatures and token accounts.
- Prevent duplicate signature processing.

Never mark an invoice as paid based solely on a transaction hash submitted by a browser.

---

# 7. PAYMENT PROCESSING ENGINE

Implement a reliable payment state machine.

Supported states:

- `created`
- `pending`
- `detected`
- `confirming`
- `confirmed`
- `underpaid`
- `overpaid`
- `expired`
- `cancelled`
- `failed`
- `reorged`

## Payment Lifecycle

1. Merchant creates a payment request.
2. FluxTx generates a payment ID.
3. Checkout displays payment instructions.
4. Blockchain indexer detects a transfer.
5. Transaction verification validates the transfer.
6. Payment matching associates the transfer with an invoice.
7. Confirmation tracking begins.
8. Payment is marked confirmed when the configured threshold is reached.
9. Webhook events are generated.
10. Merchant receives the final payment status.

## Payment Features

- Fixed-amount invoices
- Flexible-amount invoices where supported
- Payment expiration
- Unique payment references
- Transaction-to-order matching
- Exact decimal arithmetic
- Underpayment handling
- Overpayment handling
- Multiple transactions per invoice
- Partial payment support
- Late payment handling
- Duplicate payment detection
- Confirmation thresholds
- Transaction explorer links
- Payment reconciliation
- Manual review tools
- Immutable event history

Use integer base units or arbitrary-precision decimal arithmetic.

Never use JavaScript floating-point numbers for financial calculations.

Store token decimals and raw transfer values accurately.

## Payment Matching

Support multiple matching strategies:

### Shared Merchant Wallet

- Merchant configures a receiving address.
- FluxTx monitors incoming transfers.
- Match transactions using amount, token, network, time window, and payment reference where available.
- Clearly document the limitations of shared-address matching.
- Detect ambiguous payments.
- Never silently associate an ambiguous transaction with an invoice.

### Unique Deposit Address

- Generate unique addresses when supported.
- Support HD wallet derivation using public keys or descriptors where appropriate.
- Keep private keys outside FluxTx by default.
- Never require merchants to upload seed phrases.
- Document wallet setup and security requirements.

### Matching Safety

If multiple invoices could match the same transfer:

- Mark the transfer as ambiguous.
- Prevent automatic confirmation.
- Record the observation.
- Provide manual reconciliation tools.

---

# 8. NON-CUSTODIAL WALLET ARCHITECTURE

FluxTx must be non-custodial by default.

Funds must go directly to merchant-controlled wallets.

The platform must not hold, transfer, or control customer funds.

Never:

- Require seed phrases
- Request private keys
- Store private keys by default
- Generate custodial wallets without explicit separate architecture
- Claim to provide custody or exchange services

Provide:

- Merchant wallet configuration
- Address validation
- Network compatibility validation
- Optional public-key-based address derivation
- Wallet security documentation
- Testnet wallet support

Clearly distinguish between payment monitoring and actual custody.

---

# 9. CLOUDFLARE INFRASTRUCTURE

Use Cloudflare as the primary edge infrastructure.

## Cloudflare Workers

Use Workers for:

- Public REST API
- Authentication middleware
- Payment creation endpoints
- Webhook management
- Dashboard backend
- Rate limiting
- API routing
- Lightweight payment processing

## Cloudflare D1

Use D1 as the authoritative relational database for:

- Users
- Organizations
- Projects
- API keys
- Payments
- Transactions
- Payment events
- Webhook endpoints
- Webhook deliveries
- Network configuration
- Token configuration
- Audit logs
- Indexer checkpoints where appropriate

Use proper indexes, foreign keys, migrations, and transaction boundaries where supported.

## Cloudflare KV

Use KV for:

- Short-lived caching
- Public configuration
- Network metadata
- Non-authoritative idempotency cache
- Cached dashboard data
- Temporary lookup information

Never use KV as the authoritative payment database.

## Cloudflare Queues

Use Queues for:

- Blockchain observation processing
- Confirmation updates
- Webhook delivery
- Retry processing
- Payment event processing
- Background reconciliation

Implement retry policies and dead-letter handling.

## Durable Objects

Use Durable Objects where necessary for:

- Per-network coordination
- Distributed locking
- Payment matching coordination
- Webhook delivery coordination
- Real-time dashboard synchronization

Do not use Durable Objects unnecessarily for every request.

## Cron Triggers

Use scheduled jobs for:

- Blockchain polling
- Pending payment reconciliation
- Confirmation updates
- Expired invoice processing
- Retry recovery
- Network health checks

## Cloudflare R2

Optional uses:

- Exported reports
- Large audit exports
- Backup artifacts
- Historical data archives

## Cloudflare Workers AI

Optional features:

- Natural-language transaction summaries
- Developer support assistant
- Dashboard insights
- Documentation assistant

AI must never decide whether a blockchain payment is valid or confirmed.

## Cloudflare Architecture Constraints

Cloudflare Workers are not conventional always-running blockchain daemons.

Do not assume Workers can:

- Run indefinitely
- Maintain permanent WebSocket connections
- Continuously poll RPC endpoints
- Perform unlimited historical block scanning

Use:

- Cron Triggers
- Queues
- Durable Objects
- A dedicated indexer service

Provide two deployment modes:

### Cloudflare-Native

Use Workers and supported Cloudflare services for the API, scheduled processing, and event-driven workloads.

### Hybrid Deployment

Use Cloudflare Workers for the API and a separately deployable blockchain indexer for continuous monitoring.

Document the limitations and trade-offs of each mode.

Do not require paid Cloudflare services for the basic local development setup.

Do not require users to provide Cloudflare API tokens to the application at runtime.

---

# 10. CLOUDFLARE DASHBOARD CONFIGURATION

Make deployment straightforward.

Use Cloudflare Dashboard bindings where practical.

Recommended bindings:

- `db` — D1 database
- `kv` — KV namespace
- `queue` — Queue producer
- `ai` — optional Workers AI binding

Use fixed binding names and document how users select their existing Cloudflare resources in the Dashboard.

Provide a clear deployment guide covering:

1. Create a Cloudflare account.
2. Create a D1 database.
3. Create a KV namespace.
4. Create Queues if required.
5. Configure Worker bindings.
6. Apply database migrations.
7. Configure environment variables.
8. Deploy the Worker.
9. Configure the indexer.
10. Verify network connectivity.
11. Create the first administrator account.
12. Test a payment using a testnet.

Do not require runtime database provisioning through Cloudflare API tokens.

Do not require the user to manually edit source code to configure ordinary infrastructure bindings.

Provide `.env.example` for local and self-hosted deployment.

---

# 11. REST API

Create a versioned API under:

`/v1`

Use Hono and TypeScript.

## Payments

- `POST /v1/payments`
- `GET /v1/payments`
- `GET /v1/payments/:id`
- `POST /v1/payments/:id/cancel`
- `GET /v1/payments/:id/events`

## Transactions

- `GET /v1/transactions`
- `GET /v1/transactions/:hash`

## Networks

- `GET /v1/networks`
- `GET /v1/tokens`

## Webhooks

- `POST /v1/webhooks`
- `GET /v1/webhooks`
- `PATCH /v1/webhooks/:id`
- `DELETE /v1/webhooks/:id`
- `GET /v1/webhooks/:id/deliveries`
- `POST /v1/webhooks/:id/test`

## Projects

- `GET /v1/projects`
- `POST /v1/projects`
- `GET /v1/projects/:id`
- `PATCH /v1/projects/:id`

## API Keys

- `POST /v1/api-keys`
- `GET /v1/api-keys`
- `DELETE /v1/api-keys/:id`

## Authentication

Implement:

- API key authentication
- Project-scoped permissions
- Test and live environments
- API key rotation
- API key revocation
- Secure key hashing
- Request authentication middleware

API keys must be shown only once at creation.

Never store raw secret API keys in the database.

## API Standards

Implement:

- Request validation
- Zod schemas
- Pagination
- Filtering
- Sorting
- Idempotency keys
- Rate limiting
- Consistent error responses
- Request IDs
- Structured logs
- API versioning
- OpenAPI specification

Example payment creation request:

```json
{
  "amount": "25.00",
  "currency": "USDC",
  "network": "BASE",
  "orderId": "ORDER-123",
  "metadata": {
    "customerId": "customer_123"
  }
}
```

Example response:

```json
{
  "id": "pay_xxx",
  "status": "pending",
  "amount": "25.00",
  "currency": "USDC",
  "network": "BASE",
  "checkoutUrl": "https://checkout.example.com/pay/pay_xxx",
  "expiresAt": "2026-11-05T12:00:00Z"
}
```

Use generated IDs and real database records.

Never hardcode fake production payment responses.

---

# 12. WEBHOOK SYSTEM

Implement a reliable event-driven webhook system.

Supported events:

- `payment.created`
- `payment.detected`
- `payment.confirming`
- `payment.confirmed`
- `payment.underpaid`
- `payment.overpaid`
- `payment.expired`
- `payment.cancelled`
- `payment.failed`
- `payment.reorged`

## Webhook Security

Use HMAC-SHA256 signatures.

Include:

- Unique event ID
- Timestamp
- Signature
- Event type
- Payload

Implement:

- Replay protection
- Signature verification
- Idempotent delivery
- Configurable timeout
- Retry with exponential backoff
- Delivery history
- Manual retry
- Webhook secret rotation
- Dead-letter queue
- Delivery status
- Response code logging
- Failure reasons

## Webhook SSRF Protection

Prevent requests to:

- Localhost
- Private IP ranges
- Link-local addresses
- Cloud metadata endpoints
- Internal infrastructure
- Restricted network destinations

Validate URLs and resolved IP addresses.

Revalidate destinations after redirects.

Do not allow arbitrary redirect chains to bypass SSRF protection.

## SDK Verification Examples

Provide webhook verification examples for:

- TypeScript
- Python
- PHP
- Go

---

# 13. MERCHANT DASHBOARD

Build a complete React dashboard.

## Overview

Display:

- Total payment volume
- Confirmed payments
- Pending payments
- Failed payments
- Payment success rate
- Recent transactions
- Network status
- Payment activity chart

Use real database data.

Do not fabricate analytics.

## Payments

Features:

- Payment table
- Search
- Filtering
- Sorting
- Pagination
- Status indicators
- Payment detail drawer
- Transaction hash
- Amount and token
- Network
- Confirmation count
- Explorer link
- Payment timeline
- Associated order ID
- Metadata

## Transactions

Features:

- Transaction history
- Network filter
- Token filter
- Address filter
- Transaction hash search
- Confirmation status
- Amount
- Block height
- Explorer links

## API Keys

Features:

- Create API keys
- Revoke API keys
- Test and live environments
- Permission management
- Last-used information
- Secure one-time secret display

## Webhooks

Features:

- Endpoint management
- Event selection
- Secret management
- Delivery history
- Delivery detail
- Response inspection
- Retry failed delivery
- Send test event

## Networks

Features:

- Enable and disable networks
- Configure RPC providers
- Configure token contracts
- Set confirmation thresholds
- Network health monitoring
- Provider failover configuration
- Test connectivity

## Developer Portal

Features:

- API documentation
- SDK installation
- Code examples
- API playground
- Test payment simulator
- Webhook testing tools
- OpenAPI download

## Settings

Features:

- Organization settings
- Project management
- Team members
- Roles and permissions
- Security settings
- Audit logs
- Branding
- Notification preferences

All buttons, forms, dialogs, and settings must work.

---

# 14. HOSTED CHECKOUT

Create a hosted checkout application.

Route:

`/checkout/:paymentId`

## Checkout Features

- Merchant branding
- Payment amount
- Token
- Network
- Receiving address
- QR code
- Copy address
- Copy amount
- Countdown timer
- Payment instructions
- Transaction status
- Confirmation progress
- Explorer links
- Expiration state
- Payment success state
- Mobile-responsive design

Support wallet applications through standard address and QR payment instructions.

Do not require customers to connect a wallet.

Do not request private keys or seed phrases.

## Checkout State Transitions

Use animated state transitions:

- Waiting for payment
- Transaction detected
- Confirming
- Payment confirmed
- Payment expired
- Payment requires review

Use Animate UI for subtle progress and status transitions.

Never display a successful payment state until the backend confirms it.

Provide accessible fallback states for reduced-motion users.

---

# 15. SDKs

Create official SDKs for:

- TypeScript / JavaScript
- Python
- PHP
- Go

## SDK Features

- Payment creation
- Payment retrieval
- Payment listing
- Payment cancellation
- Transaction retrieval
- Webhook signature verification
- Typed API responses
- Error handling
- Retry support
- Idempotency support

Example:

```typescript
import { FluxTx } from "@fluxtx/sdk";

const client = new FluxTx({
  apiKey: process.env.FLUXTX_API_KEY
});

const payment = await client.payments.create({
  amount: "25.00",
  currency: "USDC",
  network: "BASE",
  orderId: "ORDER-123"
});

console.log(payment.checkoutUrl);
```

Provide installation instructions, examples, package metadata, and publishing documentation.

Never expose secret API keys in frontend code.

---

# 16. DATABASE DESIGN

Create normalized database schemas and migrations.

Required entities:

- Users
- Organizations
- Organization memberships
- Projects
- API keys
- Payments
- Payment events
- Blockchain transactions
- Transaction observations
- Payment matches
- Webhook endpoints
- Webhook deliveries
- Networks
- Tokens
- RPC providers
- Indexer checkpoints
- Audit logs

Requirements:

- Primary keys
- Foreign keys
- Appropriate indexes
- Unique constraints
- Timestamps
- Status fields
- Migration history
- Data integrity
- Idempotent inserts
- Transaction-safe state updates

Store blockchain amounts using raw integer values and token decimals, or an equivalent exact representation.

Avoid floating-point storage.

Provide:

- Initial migration
- Upgrade migrations
- Seed data for local development
- Database reset instructions
- Backup and restore documentation

---

# 17. AUTHENTICATION AND ADMIN SETUP

Implement secure authentication.

Features:

- Registration where enabled
- Login
- Logout
- Session management
- Password hashing
- Password reset flow where configured
- Organization management
- Role-based access control

Roles:

- Owner
- Admin
- Developer
- Viewer

For self-hosted deployment:

- Provide a first-run setup page.
- Allow the first administrator account to be created securely.
- Prevent repeated administrator initialization after setup.
- Store account information in the database.
- Do not hardcode default production credentials.

Use secure cookies and session handling.

Protect administrative routes.

---

# 18. SECURITY REQUIREMENTS

Security is a core product requirement.

Implement:

- Authentication
- Authorization
- Project isolation
- API key hashing
- Input validation
- Rate limiting
- CORS configuration
- Secure session cookies
- CSRF protection where applicable
- SSRF protection
- Replay protection
- Audit logging
- Secret management
- Request size limits
- Timeout handling
- SQL injection prevention
- XSS protection
- Secure error responses
- Blockchain transaction verification
- Duplicate transaction prevention
- Reorganization recovery

Never:

- Trust client-side payment status
- Trust an unverified transaction hash
- Store secrets in frontend bundles
- Expose credentials in logs
- Hardcode production secrets
- Use floating-point calculations for financial values
- Treat an unconfirmed transfer as final
- Automatically match ambiguous transfers

Provide a security model and threat-model documentation.

---

# 19. LOCAL DEVELOPMENT ENVIRONMENT

Provide a complete local development setup.

Use:

- Docker Compose
- Local database
- Local API
- Dashboard
- Indexer
- Webhook receiver
- Blockchain simulator
- Testnet configuration

The local environment must allow developers to:

1. Start FluxTx.
2. Create a merchant account.
3. Create a project.
4. Generate a test API key.
5. Create a payment.
6. Simulate an incoming transaction.
7. Verify transaction detection.
8. Observe payment confirmation.
9. Receive a webhook.
10. Inspect event logs.

Do not require real cryptocurrency for basic testing.

Provide realistic simulated blockchain events through a dedicated test adapter.

Clearly separate simulated data from production data.

---

# 20. TESTING

Create comprehensive automated tests.

## Unit Tests

- Payment state machine
- Payment matching
- Amount calculations
- Token decimal handling
- Confirmation tracking
- Expiration logic
- Webhook signatures
- API validation

## Integration Tests

- Payment creation
- Database persistence
- Transaction ingestion
- Payment matching
- Webhook delivery
- API key authentication
- Project isolation

## Blockchain Tests

- EVM transfer decoding
- TRON transfer decoding
- Solana transfer decoding
- Transaction success validation
- Duplicate transaction detection
- Reorganization handling
- RPC failover

## Security Tests

- Authentication bypass
- Unauthorized project access
- Webhook SSRF
- Replay attacks
- Invalid signatures
- Rate-limit bypass
- API key exposure
- Duplicate payment processing

## End-to-End Tests

- Merchant registration
- Project creation
- Payment creation
- Checkout rendering
- Simulated payment
- Confirmation
- Webhook delivery
- Dashboard status update

Use Vitest and suitable end-to-end testing tools.

Run tests and fix failures before declaring a feature complete.

---

# 21. DOCUMENTATION

Create comprehensive documentation.

Required files:

- README.md
- LICENSE
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- SECURITY.md
- SUPPORT.md
- ROADMAP.md
- CHANGELOG.md
- ARCHITECTURE.md
- API.md
- DEPLOYMENT.md
- SELF_HOSTING.md
- CLOUDFLARE.md
- BLOCKCHAIN_ADAPTERS.md
- WEBHOOKS.md
- SECURITY_MODEL.md
- TROUBLESHOOTING.md

Provide:

- API reference
- OpenAPI specification
- SDK examples
- Local setup instructions
- Cloudflare deployment instructions
- Docker deployment instructions
- Blockchain RPC configuration
- Token configuration
- Payment matching explanation
- Webhook verification
- Security limitations
- Troubleshooting guides

All documentation must match the implemented behavior.

Never claim a feature is supported if it has not been implemented and tested.

---

# 22. GITHUB OPEN-SOURCE COMMUNITY

Prepare FluxTx for public open-source adoption.

## GitHub Repository

Create:

- Professional README
- MIT license
- Contribution guidelines
- Code of conduct
- Security policy
- Support guidelines
- Roadmap
- Changelog
- Issue templates
- Pull request template
- Discussions configuration
- Labels
- Good First Issue guidance

## GitHub Actions

Implement CI workflows for:

- Dependency installation
- Type checking
- Linting
- Unit tests
- Integration tests
- Build verification
- Security checks
- Dependency auditing

Add Dependabot configuration.

Add release automation where practical.

## README Design

README should include:

- FluxTx logo
- Project description
- GitHub badges
- Feature overview
- Screenshots
- Demo GIF
- Architecture diagram
- Quick Start
- API example
- SDK installation
- Supported networks
- Cloudflare deployment
- Self-hosting guide
- Security model
- Contribution instructions
- Roadmap
- License

Use clear English for the primary README.

Provide Vietnamese documentation as an additional language if practical.

## Community Growth

Design the project to encourage real contributions:

- Easy local setup
- Modular blockchain adapters
- Good First Issues
- Clear contribution process
- Useful documentation
- Reproducible bug reports
- Transparent roadmap
- Public discussions
- Demo environment

Do not use fake GitHub stars, fake contributors, fake testimonials, or misleading badges.

Focus on genuine developer value and organic adoption.

---

# 23. DEPLOYMENT OPTIONS

Provide multiple deployment options.

## Cloudflare Deployment

- Workers
- D1
- KV
- Queues
- Durable Objects where necessary
- Cron Triggers
- Optional R2

## Docker Deployment

Provide Docker Compose for:

- API
- Dashboard
- Indexer
- Database
- Webhook worker
- Local simulator

## Hybrid Deployment

- Cloudflare API layer
- Self-hosted blockchain indexer
- Configurable RPC providers
- Managed or self-hosted database where appropriate

Provide:

- Environment variable documentation
- Production configuration
- Migration instructions
- Backup instructions
- Restore instructions
- Health checks
- Logging
- Monitoring
- Troubleshooting

---

# 24. PERFORMANCE AND RELIABILITY

Optimize for practical production workloads.

Implement:

- Efficient database queries
- Pagination
- Indexing
- Caching
- Queue-based processing
- RPC request batching where supported
- Backpressure
- Retry policies
- Rate limiting
- Structured logging
- Health checks
- Graceful shutdown
- Indexer checkpoints
- Recovery after downtime

Avoid:

- Unnecessary blockchain polling
- Scanning all historical blocks on every restart
- Duplicate event processing
- Excessive database queries
- Blocking API requests on long-running blockchain operations

Provide metrics for:

- API latency
- RPC latency
- Indexer lag
- Queue depth
- Webhook delivery success
- Payment confirmation latency
- Network health

---

# 25. IMPLEMENTATION PHASES

Execute the project through these phases.

## Phase 1 — Repository and Architecture

- Inspect repository
- Define monorepo structure
- Configure TypeScript
- Configure package manager
- Configure linting and formatting
- Define architecture
- Create initial documentation

## Phase 2 — UI Foundation

- Configure React and Next.js
- Install Tailwind CSS
- Configure shadcn/ui
- Install Animate UI
- Create design tokens
- Implement theme system
- Build shared layout
- Create navigation and responsive shell

## Phase 3 — Database and Authentication

- Create database schemas
- Implement migrations
- Implement authentication
- Implement organizations
- Implement projects
- Implement roles and permissions

## Phase 4 — Payment API

- Implement payment creation
- Implement payment retrieval
- Implement payment listing
- Implement idempotency
- Implement API keys
- Implement validation
- Implement OpenAPI

## Phase 5 — Blockchain Adapter Framework

- Define adapter interfaces
- Implement test adapter
- Implement EVM adapter
- Implement RPC provider management
- Implement transaction decoding

## Phase 6 — Blockchain Indexer

- Implement block tracking
- Implement transfer detection
- Implement checkpoint persistence
- Implement RPC failover
- Implement confirmation tracking
- Implement reorganization handling

## Phase 7 — Payment Matching

- Implement payment state machine
- Implement matching strategies
- Implement underpayment handling
- Implement overpayment handling
- Implement expiration
- Implement manual reconciliation

## Phase 8 — Webhook Infrastructure

- Implement event generation
- Implement signed payloads
- Implement delivery queue
- Implement retry policies
- Implement delivery logs
- Implement SSRF protection

## Phase 9 — Checkout

- Implement hosted checkout
- Implement QR generation
- Implement payment instructions
- Implement real-time status updates
- Implement expiration
- Implement animated payment states

## Phase 10 — Merchant Dashboard

- Implement overview
- Implement payments
- Implement transactions
- Implement API keys
- Implement webhooks
- Implement network configuration
- Implement developer portal
- Implement settings

## Phase 11 — SDKs

- TypeScript SDK
- Python SDK
- PHP SDK
- Go SDK
- Documentation and examples

## Phase 12 — Cloudflare and Self-Hosting

- Configure Workers
- Configure D1
- Configure KV
- Configure Queues
- Configure Durable Objects
- Configure Cron Triggers
- Implement Docker Compose
- Write deployment guides

## Phase 13 — Testing and Security

- Unit tests
- Integration tests
- End-to-end tests
- Security testing
- Performance testing
- Dependency auditing

## Phase 14 — Open-Source Release

- Complete README
- Add documentation
- Add CI workflows
- Add issue templates
- Add contribution guidelines
- Add release checklist
- Verify fresh installation
- Prepare v1.0.0 release candidate

Do not skip phases merely to produce a visually impressive demo.

---

# 26. FINAL ACCEPTANCE CRITERIA

FluxTx is considered ready for its initial release only when:

1. A developer can run the project locally.
2. A merchant can create an account.
3. A merchant can create a project.
4. A merchant can generate an API key.
5. A payment can be created through the API.
6. Checkout displays correct payment instructions.
7. The test adapter can simulate a blockchain transfer.
8. The indexer detects and processes the transfer.
9. Payment matching works correctly.
10. Confirmation thresholds are respected.
11. Payment status is persisted in the database.
12. Webhooks are generated and signed.
13. Webhook delivery and retry work.
14. Dashboard status updates correctly.
15. API keys can be revoked.
16. Project isolation is enforced.
17. Database migrations work from a fresh installation.
18. Tests pass.
19. Documentation matches the implementation.
20. Cloudflare deployment instructions are complete.
21. Self-hosting instructions are complete.
22. No critical security issues remain unresolved.

Clearly document any feature that is still experimental or incomplete.

---

# 27. FINAL INSTRUCTIONS TO THE AI AGENT

Begin by inspecting the repository and reading the official Animate UI documentation.

Then:

1. Define the complete architecture.
2. Create the project structure.
3. Implement the frontend foundation.
4. Implement backend services.
5. Implement the payment engine.
6. Implement blockchain monitoring.
7. Implement webhooks.
8. Implement the dashboard and checkout.
9. Implement SDKs.
10. Add deployment support.
11. Write tests.
12. Fix errors.
13. Complete documentation.
14. Prepare the GitHub release.

Use real integrations wherever possible.

Use test adapters only for local development and automated testing.

Do not fabricate successful blockchain payments.

Do not leave non-functional buttons, forms, routes, or API endpoints.

Do not stop after creating the frontend.

Do not remove requested features to simplify the implementation without documenting the limitation.

Prioritize:

1. Correctness
2. Security
3. Reliability
4. Developer experience
5. Maintainability
6. Performance
7. User interface quality
8. Open-source adoption

Continue implementing FluxTx. The previous status report is an honest assessment of the current incomplete state, NOT a reason to stop development.

MANDATORY INSTRUCTIONS:

1. ENVIRONMENT CONSTRAINTS
- Work within the existing Windows environment.
- Docker is currently unavailable. Do not make Docker a prerequisite.
- Use Cloudflare Wrangler, Miniflare, Vite and other native Node.js tooling wherever possible.
- Do not introduce container-dependent functionality unless absolutely necessary.
- If a feature requires Docker, provide a non-Docker development alternative.
- Do not stop implementation merely because Docker is missing.

2. GIT INITIALIZATION
- Inspect the current directory before making changes.
- If it is not already a Git repository, initialize it with `git init`.
- Create a suitable `.gitignore`.
- Never delete existing files or overwrite existing Git history.
- Do not commit secrets, API keys, private keys, `.env` files or credentials.
- Do not create a remote repository or push without permission.

3. IMPLEMENTATION
Implement the actual FluxTx product, not just documentation or mockups.

Prioritize:
- React + TypeScript frontend using Animate UI.
- Authentication and authorization.
- Core payment API.
- Payment lifecycle and transaction matching.
- Blockchain indexer architecture.
- At least one complete blockchain adapter, selected based on practical implementation feasibility.
- Webhook delivery, signature verification and retry handling.
- Cloudflare D1, KV, Workers and Queues integration.
- Tests and API documentation.

4. VERIFIED BLOCKCHAIN SUPPORT
- Never advertise a chain as supported before its adapter is implemented and tested against real testnet data.
- Clearly distinguish SUPPORTED, BETA, IN_PROGRESS and PLANNED.
- Never fabricate integration tests or successful transactions.

5. PROGRESS MANAGEMENT
- Maintain `IMPLEMENTATION_PLAN.md` and `TASKS.md`.
- If context is running low, save all progress before stopping.
- Resume from the first unfinished task in the next session.
- Preserve completed work.
- Work phase by phase, test each phase and fix failures before proceeding.

6. FINAL REPORT
At the end of each development session, report:
- Features actually implemented.
- Files created or modified.
- Tests executed and their real results.
- Current Git status.
- Remaining blockers.
- Next implementation phase.

Do not claim production readiness until all required functionality and verification criteria have genuinely passed.

START NOW: inspect the existing project, initialize Git safely if needed, update the implementation plan, and continue with the highest-priority unfinished implementation task. Do not stop after producing another status report.



The final product must be a real, usable, extensible open-source payment infrastructure.

**Build FluxTx as a complete product, not merely a prototype.**
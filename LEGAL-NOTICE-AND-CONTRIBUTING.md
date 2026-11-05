# Legal Notice & Developer Contribution Guidelines

> **FluxTx — One API. Every Chain. Payments in Motion.**

## 1. Legal Notice & Disclaimer

FluxTx is an open-source, non-custodial blockchain payment monitoring and reconciliation project. It is designed primarily for international developers, merchants, and organizations that need infrastructure for detecting and reconciling blockchain transactions.

FluxTx does not intend to provide legal, financial, investment, or regulatory advice.

### 1.1. Regulatory Compliance

Blockchain and digital asset regulations vary between countries and jurisdictions. Users are responsible for understanding and complying with the laws and regulations applicable to their location and activities.

By using, deploying, integrating, or modifying FluxTx, you acknowledge that:

- You are responsible for determining whether your intended use is legally permitted in your jurisdiction.
- You must comply with applicable payment, financial services, digital asset, anti-money laundering (AML), sanctions, consumer protection, and data protection requirements.
- You must obtain any licenses, registrations, or approvals required for your activities.
- You must not use FluxTx to facilitate unlawful transactions or prohibited activities.

### 1.2. Vietnam-Specific Notice

FluxTx is developed for international use and is not geographically restricted by default. Users located in Vietnam may access and use the software, subject to applicable Vietnamese law.

However, the availability of this open-source software does not mean that every possible use of it is legally permitted in Vietnam.

In particular:

- The use of digital assets as a means of payment may be subject to restrictions under Vietnamese law.
- Monitoring public blockchain transactions is not necessarily equivalent to operating a payment service.
- Operating a commercial payment service, facilitating transactions, or accepting digital assets for goods and services may trigger additional legal requirements.
- Users must independently assess the legality of their specific activities before deploying FluxTx.

Relevant regulations may include Decree No. 52/2024/ND-CP, Resolution No. 05/2025/NQ-CP, and other applicable Vietnamese legislation, as amended or replaced.

**Important:** Accepting this notice or agreeing to the Terms of Use does not legalize an otherwise prohibited activity or remove legal obligations imposed on the user, developer, operator, or service provider.

### 1.3. No Custody or Guarantee

FluxTx is designed around a non-custodial architecture. It is intended to monitor and reconcile transaction information rather than hold or control users' private keys or funds.

Unless explicitly implemented and documented otherwise, FluxTx:

- Does not custody digital assets.
- Does not guarantee transaction execution or settlement.
- Does not guarantee the availability, accuracy, or completeness of third-party blockchain RPC providers.
- Does not guarantee that a transaction is irreversible.
- Does not guarantee that a detected transaction satisfies a merchant's legal or commercial requirements.

Users should independently verify important transactions and implement appropriate operational safeguards.

### 1.4. Software Status

FluxTx is under active development and is **NOT PRODUCTION READY**.

Current limitations include:

- Real blockchain adapters and transaction indexers are not yet verified for production use.
- Current transaction simulation uses synthetic data and has no monetary value.
- No blockchain network should be considered officially supported until it passes the project's verification requirements.
- Production-grade webhook delivery, monitoring, and other operational safeguards may not yet be available.

Do not use the current alpha version to process real payments or manage real funds.

---

## 2. Developer Contribution Guidelines

Contributions are welcome from developers, blockchain engineers, security researchers, and infrastructure enthusiasts.

FluxTx aims to provide a consistent reconciliation layer across multiple blockchain networks.

A major part of this architecture is supporting two complementary transaction-matching methods.

### 2.1. Address-Based Matching

Address-based matching identifies a payment by checking the transaction's destination address and other expected transaction properties.

A typical matching process should verify:

1. Blockchain network.
2. Destination or recipient address.
3. Token contract or native asset.
4. Exact transaction amount in base units.
5. Transaction status and confirmation requirements.
6. Whether the transaction has already been processed.

**Example:**

A merchant creates an invoice expecting:

- Network: Ethereum
- Asset: USDT
- Recipient: `0xMerchantWallet`
- Amount: `100 USDT`

The indexer detects an ERC-20 `Transfer` event and checks whether its recipient, token contract, and exact amount match the invoice.

If the transaction matches but has insufficient confirmations, its status should remain `CONFIRMING`, not `PAID`.

**Implementation considerations:**

- Prefer exact base-unit comparisons instead of floating-point arithmetic.
- Use transaction hashes and log indexes to identify individual transfer events.
- Handle partial payments and overpayments.
- Prevent duplicate transaction processing.
- Account for chain reorganizations and confirmation changes.
- Avoid assuming that address + amount alone uniquely identifies an invoice.

Where possible, consider unique deposit addresses or other collision-resistant identification strategies.

### 2.2. Memo / Reference-Based Matching

Some blockchain networks and payment protocols support transaction memos, destination tags, payment references, or similar identifiers.

FluxTx should support these identifiers when the underlying network or protocol provides them.

A typical matching process should verify:

1. Blockchain network.
2. Memo, reference, destination tag, or equivalent identifier.
3. Recipient address or destination account, where applicable.
4. Token or asset.
5. Exact amount.
6. Transaction status and confirmation requirements.
7. Duplicate processing protection.

**Example:**

A merchant creates an invoice with the reference:

`FLUXTX-INV-2026-000123`

When a supported blockchain transaction includes this reference, the reconciliation engine can use it to identify the intended invoice, while still validating the transaction's network, destination, asset, and amount.

**Implementation considerations:**

- Only use memo/reference fields when supported by the relevant chain or protocol.
- Do not assume every blockchain supports transaction memos.
- Validate the reference against the expected invoice.
- Handle missing, malformed, duplicated, or conflicting references.
- Never trust a memo alone without validating the transaction itself.

### 2.3. Matching Priority

The reconciliation engine should support both methods without assuming that every network provides the same transaction fields.

Recommended matching flow:

1. Detect a transaction from a verified network data source.
2. Parse the transaction and its relevant transfer events.
3. If a valid memo/reference is available, attempt reference-based matching.
4. Validate the destination, network, asset, and amount.
5. If no usable reference exists, attempt address-based matching.
6. Check for duplicate or conflicting matches.
7. Apply the confirmation and finality policy.
8. Update the invoice state and persist the transaction observation.

A transaction must not be marked `PAID` solely because a matching reference or destination address was found.

### 2.4. Expected Payment States

Contributors should preserve consistent payment lifecycle semantics.

| State | Meaning |
|---|---|
| `PENDING` | Waiting for a matching transaction |
| `CONFIRMING` | A matching transaction has been detected but has insufficient confirmations |
| `PARTIALLY_PAID` | Received amount is lower than the expected amount |
| `PAID` | Payment satisfies the configured verification and confirmation requirements |
| `OVERPAID` | Received amount exceeds the expected amount |
| `EXPIRED` | Invoice has expired |
| `CANCELLED` | Invoice has been cancelled |

Actual state transitions must be validated against the existing domain model and business rules.

### 2.5. Network Adapter Requirements

When contributing a blockchain adapter:

- Follow the existing adapter and domain interfaces.
- Clearly distinguish observed transactions from verified payments.
- Support pagination and bounded RPC requests.
- Handle temporary RPC failures and rate limits.
- Preserve transaction hashes, block heights, and event identifiers.
- Handle chain reorganizations where applicable.
- Implement idempotent transaction ingestion.
- Include tests using realistic fixtures.
- Never mark a network as `SUPPORTED` without completing the project's real-network verification requirements.

Synthetic simulator data must never be presented as real blockchain transaction evidence.

---

## 3. How to Contribute

1. Fork the FluxTx repository.
2. Create a feature branch.
3. Review `IMPLEMENTATION_PLAN.md` and `TASKS.md`.
4. Follow the existing architecture and coding conventions.
5. Add or update tests for your changes.
6. Run the relevant tests, type checks, and lint checks.
7. Submit a Pull Request describing the changes and their limitations.

### Good Areas to Contribute

- Blockchain network adapters.
- Transaction indexers.
- Address-based reconciliation.
- Memo/reference-based reconciliation.
- Confirmation and finality handling.
- Chain reorganization handling.
- Duplicate transaction prevention.
- RPC provider integrations.
- Security reviews.
- Documentation and test coverage.

### Contribution Principles

- Keep changes focused and reviewable.
- Do not claim unsupported functionality.
- Do not introduce custodial behavior without explicit architectural approval.
- Do not expose private keys, secrets, or sensitive credentials.
- Do not bypass transaction verification or confirmation requirements.
- Document network-specific behavior and limitations.

---

## 4. Important Acknowledgment

FluxTx is an open-source infrastructure project. Its developers and contributors aim to build reliable blockchain transaction monitoring and reconciliation software, but the project does not guarantee that every deployment or use case is legally compliant in every jurisdiction.

Users and operators remain responsible for their own activities and regulatory obligations.

By contributing to FluxTx, developers should help maintain these principles:

- Transparency.
- Non-custodial design.
- Accurate transaction verification.
- Reliable reconciliation.
- Security-first engineering.
- Responsible and lawful use.

---

**Project:** FluxTx  
**License:** MIT  
**Status:** Early Alpha — Not Production Ready

*This document is an informational project notice, not a substitute for advice from a qualified legal professional.*

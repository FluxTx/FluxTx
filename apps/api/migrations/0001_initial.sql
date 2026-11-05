PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE organization_memberships (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (organization_id, user_id)
) STRICT;

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('test', 'live')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (organization_id, name, environment)
) STRICT;

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('test', 'live')),
  revoked_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE networks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  family TEXT NOT NULL CHECK (family IN ('evm', 'tron', 'solana', 'bitcoin', 'test-simulator')),
  support_status TEXT NOT NULL CHECK (
    support_status IN ('SUPPORTED', 'BETA', 'IN_PROGRESS', 'PLANNED', 'UNSUPPORTED')
  ),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1))
) STRICT;

CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  network_id TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  decimals INTEGER NOT NULL CHECK (decimals BETWEEN 0 AND 255),
  explorer_url TEXT NOT NULL,
  confirmations_required INTEGER NOT NULL CHECK (confirmations_required > 0),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  UNIQUE (network_id, address)
) STRICT;

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  token_id TEXT NOT NULL REFERENCES tokens(id),
  status TEXT NOT NULL CHECK (
    status IN (
      'created', 'pending', 'detected', 'confirming', 'confirmed', 'underpaid',
      'overpaid', 'expired', 'cancelled', 'failed', 'reorged'
    )
  ),
  amount_raw TEXT NOT NULL CHECK (length(amount_raw) > 0),
  amount_due_raw TEXT NOT NULL CHECK (length(amount_due_raw) > 0),
  order_id TEXT,
  receiving_address TEXT NOT NULL,
  idempotency_key TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, idempotency_key)
) STRICT;

CREATE TABLE blockchain_transactions (
  id TEXT PRIMARY KEY,
  network_id TEXT NOT NULL REFERENCES networks(id),
  transaction_hash TEXT NOT NULL,
  block_height INTEGER,
  block_hash TEXT,
  transaction_index INTEGER,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  confirmations INTEGER NOT NULL DEFAULT 0 CHECK (confirmations >= 0),
  finality_status TEXT NOT NULL CHECK (
    finality_status IN ('pending', 'confirming', 'finalized', 'reorged', 'failed')
  ),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (network_id, transaction_hash)
) STRICT;

CREATE TABLE transaction_observations (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES blockchain_transactions(id) ON DELETE CASCADE,
  token_id TEXT NOT NULL REFERENCES tokens(id),
  sender_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  amount_raw TEXT NOT NULL CHECK (length(amount_raw) > 0),
  observed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (transaction_id, token_id, sender_address, recipient_address, amount_raw)
) STRICT;

CREATE TABLE payment_matches (
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  observation_id TEXT NOT NULL REFERENCES transaction_observations(id),
  match_status TEXT NOT NULL CHECK (match_status IN ('matched', 'ambiguous', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (payment_id, observation_id)
) STRICT;

CREATE TABLE payment_events (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE webhook_endpoints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE webhook_deliveries (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES payment_events(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'retrying', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  response_status INTEGER,
  next_attempt_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (endpoint_id, event_id)
) STRICT;

CREATE TABLE rpc_providers (
  id TEXT PRIMARY KEY,
  network_id TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  endpoint_url TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  UNIQUE (network_id, endpoint_url)
) STRICT;

CREATE TABLE indexer_checkpoints (
  network_id TEXT PRIMARY KEY REFERENCES networks(id) ON DELETE CASCADE,
  block_height INTEGER NOT NULL CHECK (block_height >= 0),
  block_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_projects_organization ON projects (organization_id);
CREATE INDEX idx_api_keys_project_active ON api_keys (project_id, revoked_at);
CREATE INDEX idx_payments_project_created ON payments (project_id, created_at DESC);
CREATE INDEX idx_payments_project_status ON payments (project_id, status);
CREATE INDEX idx_payments_expires ON payments (status, expires_at);
CREATE INDEX idx_transaction_observations_recipient ON transaction_observations (recipient_address);
CREATE INDEX idx_payment_events_payment_created ON payment_events (payment_id, created_at);
CREATE INDEX idx_webhook_deliveries_due ON webhook_deliveries (status, next_attempt_at);
CREATE INDEX idx_audit_logs_organization_created ON audit_logs (organization_id, created_at DESC);

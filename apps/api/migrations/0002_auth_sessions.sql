ALTER TABLE users ADD COLUMN email_verified_at TEXT;
ALTER TABLE api_keys ADD COLUMN name TEXT NOT NULL DEFAULT 'API key';
ALTER TABLE api_keys ADD COLUMN permissions TEXT NOT NULL
  DEFAULT '["invoices:read","invoices:write","transactions:read"]';

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  succeeded INTEGER NOT NULL CHECK (succeeded IN (0, 1))
) STRICT;

CREATE INDEX idx_sessions_user_expires ON sessions (user_id, expires_at);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);
CREATE INDEX idx_login_attempts_email_time ON login_attempts (email, attempted_at);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts (ip_address, attempted_at);

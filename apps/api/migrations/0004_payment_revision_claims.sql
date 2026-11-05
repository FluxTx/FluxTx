ALTER TABLE payments ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;

CREATE TABLE payment_revision_claims (
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (payment_id, revision)
) STRICT;

CREATE INDEX idx_payment_revision_claims_created ON payment_revision_claims (created_at);

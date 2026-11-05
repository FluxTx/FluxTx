ALTER TABLE payments ADD COLUMN idempotency_hash TEXT;

CREATE INDEX idx_payments_project_order ON payments (project_id, order_id);
CREATE INDEX idx_payment_matches_observation ON payment_matches (observation_id, match_status);

INSERT INTO networks (id, name, family, support_status, enabled)
VALUES (
  'local-test-simulator',
  'Local Test Simulator (not a blockchain)',
  'test-simulator',
  'UNSUPPORTED',
  1
);

INSERT INTO tokens (
  id, network_id, symbol, name, address, decimals, explorer_url,
  confirmations_required, enabled
) VALUES (
  'local-test-asset',
  'local-test-simulator',
  'TST',
  'Local Test Asset (no monetary value)',
  'native',
  6,
  'http://localhost',
  1,
  1
);

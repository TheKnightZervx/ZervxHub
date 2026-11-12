ALTER TABLE developer_api_keys ADD COLUMN public_id TEXT;
UPDATE developer_api_keys
SET public_id = lower(hex(randomblob(16)))
WHERE public_id IS NULL;
CREATE UNIQUE INDEX idx_developer_api_keys_public_id
  ON developer_api_keys (public_id);

ALTER TABLE keys ADD COLUMN public_id TEXT;
ALTER TABLE keys ADD COLUMN revoked_at INTEGER;
ALTER TABLE keys ADD COLUMN validation_count INTEGER NOT NULL DEFAULT 0;
UPDATE keys
SET public_id = lower(hex(randomblob(16)))
WHERE public_id IS NULL;
CREATE UNIQUE INDEX idx_keys_public_id
  ON keys (public_id);
CREATE INDEX idx_keys_developer_created
  ON keys (developer_id, created_at DESC);

CREATE TABLE developer_sessions (
  session_hash TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX idx_developer_sessions_developer
  ON developer_sessions (developer_id, expires_at DESC);

CREATE TABLE developer_subscriptions (
  developer_id TEXT PRIMARY KEY REFERENCES developers(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'starter', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
  billing_period TEXT NOT NULL DEFAULT 'none'
    CHECK (billing_period IN ('none', 'monthly', 'yearly')),
  current_period_start INTEGER,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0
    CHECK (cancel_at_period_end IN (0, 1)),
  limits_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(limits_json)),
  provider TEXT,
  provider_subscription_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_developer_subscription_provider
  ON developer_subscriptions (provider, provider_subscription_id)
  WHERE provider IS NOT NULL AND provider_subscription_id IS NOT NULL;

CREATE TABLE subscription_change_requests (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  from_plan TEXT NOT NULL
    CHECK (from_plan IN ('free', 'starter', 'pro', 'business')),
  requested_plan TEXT NOT NULL
    CHECK (requested_plan IN ('free', 'starter', 'pro', 'business')),
  billing_period TEXT NOT NULL
    CHECK (billing_period IN ('none', 'monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'canceled', 'completed')),
  requested_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE UNIQUE INDEX idx_subscription_one_pending_request
  ON subscription_change_requests (developer_id)
  WHERE status = 'pending';
CREATE INDEX idx_subscription_requests_developer
  ON subscription_change_requests (developer_id, requested_at DESC);

CREATE TABLE license_events (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  license_id TEXT NOT NULL REFERENCES keys(public_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('issued', 'revoked', 'expired')),
  occurred_at INTEGER NOT NULL,
  universe_id TEXT
);
CREATE INDEX idx_license_events_developer_time
  ON license_events (developer_id, occurred_at DESC);
CREATE INDEX idx_license_events_license_time
  ON license_events (license_id, occurred_at DESC);
CREATE UNIQUE INDEX idx_license_events_idempotent
  ON license_events (license_id, event_type, occurred_at);

CREATE TABLE license_validation_daily (
  license_id TEXT NOT NULL REFERENCES keys(public_id) ON DELETE CASCADE,
  developer_id TEXT NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  usage_date TEXT NOT NULL,
  universe_id TEXT NOT NULL,
  validation_count INTEGER NOT NULL DEFAULT 0 CHECK (validation_count >= 0),
  last_validated_at INTEGER NOT NULL,
  PRIMARY KEY (license_id, usage_date)
);
CREATE INDEX idx_license_validation_developer_date
  ON license_validation_daily (developer_id, usage_date DESC);

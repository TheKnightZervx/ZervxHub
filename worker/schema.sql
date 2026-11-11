PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS keys (
  key_hash TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER,
  last_roblox_user_id TEXT,
  allowed_universe_ids TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_keys_discord_status
  ON keys (discord_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keys_expiry ON keys (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_keys_discord_created
  ON keys (discord_user_id, created_at DESC);

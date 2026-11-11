CREATE TABLE IF NOT EXISTS keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  discord_user_id TEXT NOT NULL,
  roblox_user_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_keys_discord_user ON keys(discord_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_keys_expiry ON keys(expires_at, revoked_at);
CREATE TABLE IF NOT EXISTS redemption_limits (
  discord_user_id TEXT PRIMARY KEY,
  last_issued_at INTEGER NOT NULL
);

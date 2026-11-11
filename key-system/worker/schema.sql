CREATE TABLE IF NOT EXISTS keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL UNIQUE,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  bound_roblox_user_id TEXT,
  bound_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_keys_discord_user ON keys(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_keys_expiry ON keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_keys_bound_user ON keys(bound_roblox_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_key_per_discord_user
  ON keys(discord_user_id) WHERE status = 'active';

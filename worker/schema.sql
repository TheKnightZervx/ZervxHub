-- Consolidated schema snapshot for fresh databases.
-- Existing D1 databases must use the ordered SQL files in ./migrations/.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS developers (
  id TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS developer_api_keys (
  key_hash TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id),
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id),
  universe_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL,
  verified_at INTEGER
);

CREATE TABLE IF NOT EXISTS discord_integrations (
  guild_id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS keys (
  key_hash TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER,
  last_roblox_user_id TEXT,
  allowed_universe_ids TEXT NOT NULL DEFAULT '',
  developer_id TEXT REFERENCES developers(id)
);

CREATE INDEX IF NOT EXISTS idx_keys_discord_status
  ON keys (discord_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keys_expiry
  ON keys (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_keys_discord_created
  ON keys (discord_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_developer
  ON developer_api_keys (developer_id);
CREATE INDEX IF NOT EXISTS idx_games_developer
  ON games (developer_id, status);
CREATE INDEX IF NOT EXISTS idx_discord_integrations_developer
  ON discord_integrations (developer_id);
CREATE INDEX IF NOT EXISTS idx_keys_developer
  ON keys (developer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keys_developer_discord_created
  ON keys (developer_id, discord_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_universe_status
  ON games (universe_id, status);

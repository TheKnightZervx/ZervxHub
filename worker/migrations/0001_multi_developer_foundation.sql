PRAGMA foreign_keys = ON;

CREATE TABLE developers (
  id TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at INTEGER NOT NULL
);

CREATE TABLE developer_api_keys (
  key_hash TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id),
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX idx_developer_api_keys_developer
  ON developer_api_keys (developer_id);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id),
  universe_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL,
  verified_at INTEGER
);

CREATE INDEX idx_games_developer
  ON games (developer_id, status);

CREATE TABLE discord_integrations (
  guild_id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL REFERENCES developers(id),
  created_at INTEGER NOT NULL
);

ALTER TABLE keys ADD COLUMN developer_id TEXT
  REFERENCES developers(id);

CREATE INDEX idx_keys_developer
  ON keys (developer_id, status, created_at DESC);
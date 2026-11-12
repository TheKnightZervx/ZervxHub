PRAGMA foreign_keys = ON;

CREATE UNIQUE INDEX idx_games_developer_universe
  ON games (developer_id, universe_id);

CREATE TABLE game_server_keys (
  key_hash TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  developer_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (developer_id, universe_id)
    REFERENCES games (developer_id, universe_id) ON DELETE CASCADE
);

CREATE INDEX idx_game_server_keys_developer
  ON game_server_keys (developer_id, universe_id);
CREATE UNIQUE INDEX idx_game_server_keys_active_universe
  ON game_server_keys (universe_id) WHERE revoked_at IS NULL;

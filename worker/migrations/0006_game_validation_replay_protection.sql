PRAGMA foreign_keys = ON;

CREATE TABLE game_validation_requests (
  request_id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL REFERENCES games(universe_id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_game_validation_requests_expiry
  ON game_validation_requests (expires_at);

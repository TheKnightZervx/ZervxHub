CREATE INDEX IF NOT EXISTS idx_keys_developer_discord_created
  ON keys (developer_id, discord_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discord_integrations_developer
  ON discord_integrations (developer_id);

CREATE INDEX IF NOT EXISTS idx_games_universe_status
  ON games (universe_id, status);

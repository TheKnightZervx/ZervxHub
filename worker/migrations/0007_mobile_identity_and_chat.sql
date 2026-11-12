PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS mobile_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mobile_email_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mobile_email_challenges_email_time
  ON mobile_email_challenges(email, created_at DESC);

CREATE TABLE IF NOT EXISTS mobile_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES mobile_users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mobile_sessions_user
  ON mobile_sessions(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS mobile_rate_limits (
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 1),
  PRIMARY KEY(scope, key_hash)
);

CREATE TABLE IF NOT EXISTS mobile_conversations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('global', 'direct', 'group')),
  name TEXT,
  pair_key TEXT UNIQUE,
  created_by TEXT REFERENCES mobile_users(id),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mobile_conversation_members (
  conversation_id TEXT NOT NULL REFERENCES mobile_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES mobile_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY(conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_mobile_members_user
  ON mobile_conversation_members(user_id, joined_at DESC);

CREATE TABLE IF NOT EXISTS mobile_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES mobile_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES mobile_users(id),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  edited_at INTEGER,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mobile_messages_conversation_time
  ON mobile_messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mobile_user_blocks (
  blocker_id TEXT NOT NULL REFERENCES mobile_users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES mobile_users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(blocker_id, blocked_id),
  CHECK(blocker_id <> blocked_id)
);
CREATE TABLE IF NOT EXISTS mobile_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES mobile_users(id),
  target_user_id TEXT NOT NULL REFERENCES mobile_users(id),
  conversation_id TEXT REFERENCES mobile_conversations(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mobile_reports_created
  ON mobile_reports(created_at DESC);

INSERT OR IGNORE INTO mobile_conversations (id, kind, name, created_at)
VALUES ('global', 'global', 'Global Community', 0);

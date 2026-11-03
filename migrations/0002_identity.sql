CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  recovery_hash TEXT NOT NULL UNIQUE
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX survivors_created_at ON survivors(created_at DESC);
CREATE TABLE request_limits (
  bucket TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL
);
CREATE INDEX request_limits_expiry ON request_limits(expires_at);

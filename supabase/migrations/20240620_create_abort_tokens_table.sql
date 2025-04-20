-- Create a table to track abort tokens for background processes
CREATE TABLE IF NOT EXISTS abort_tokens (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  process_type TEXT,
  -- Tokens automatically expire after 24 hours
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create index on expiration to make cleanup efficient
CREATE INDEX IF NOT EXISTS idx_abort_tokens_expires_at ON abort_tokens(expires_at);

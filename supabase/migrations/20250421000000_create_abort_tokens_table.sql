-- Create a table to store abort tokens for long-running operations
-- This replaces the in-memory token system which doesn't work well in serverless environments

-- Create the abort_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.abort_tokens (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.abort_tokens IS 'Stores abort tokens for cancelling long-running operations';

-- Add index for faster lookups by token
CREATE INDEX IF NOT EXISTS idx_abort_tokens_token ON public.abort_tokens(token);

-- Add index for faster cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_abort_tokens_created_at ON public.abort_tokens(created_at);

-- RLS policy - allow authenticated users to manage abort tokens
ALTER TABLE public.abort_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users"
  ON public.abort_tokens
  FOR ALL
  TO authenticated
  USING (true);

-- Analyze the table for better query planning
ANALYZE public.abort_tokens;

-- Notify the PostgREST server to reload its configuration
NOTIFY pgrst, 'reload config';
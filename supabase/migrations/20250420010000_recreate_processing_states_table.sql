-- Recreate the processing_states table that was accidentally dropped

-- Create the processing_states table
CREATE TABLE IF NOT EXISTS public.processing_states (
  "id" SERIAL PRIMARY KEY,
  "media_item_id" UUID REFERENCES public.media_items(id) ON DELETE CASCADE,
  "type" TEXT NOT NULL, -- Examples: 'exif', 'thumbnail', 'dateCorrection', etc.
  "status" TEXT NOT NULL, -- Examples: 'pending', 'processing', 'success', 'error', 'skipped', 'unsupported'
  "processed_at" TIMESTAMP WITH TIME ZONE,
  "error_message" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.processing_states IS 'Stores processing state information for media items';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_processing_states_media_item_id ON public.processing_states(media_item_id);
CREATE INDEX IF NOT EXISTS idx_processing_states_type ON public.processing_states(type);
CREATE INDEX IF NOT EXISTS idx_processing_states_status ON public.processing_states(status);
CREATE INDEX IF NOT EXISTS idx_processing_states_type_status ON public.processing_states(type, status);

-- Add row level security policy
ALTER TABLE public.processing_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users"
  ON public.processing_states
  FOR ALL
  TO authenticated
  USING (true);

-- Analyze the table for better query planning
ANALYZE public.processing_states;

-- Notify the PostgREST server to reload its configuration
NOTIFY pgrst, 'reload config';
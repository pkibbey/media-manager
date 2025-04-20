-- Add processing_state JSONB column to media_items table
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS processing_state JSONB DEFAULT NULL;

-- Create index for faster queries on processing_state fields
CREATE INDEX IF NOT EXISTS idx_media_items_processing_thumbnail_status ON media_items USING gin ((processing_state->'thumbnail'->'status'));
CREATE INDEX IF NOT EXISTS idx_media_items_processing_exif_status ON media_items USING gin ((processing_state->'exif'->'status'));

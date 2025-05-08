-- Add gps_location field back to image_analysis table
ALTER TABLE image_analysis ADD COLUMN IF NOT EXISTS gps_location JSONB;

-- Add comment to explain field purpose
COMMENT ON COLUMN image_analysis.gps_location IS 'GPS coordinates data from image analysis in JSON format with latitude and longitude';
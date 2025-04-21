-- This migration updates the reset_all_thumbnails function to work with the current schema
-- and implements a simpler approach that doesn't pre-filter by file type

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS reset_all_thumbnails();

-- Create the updated function
CREATE OR REPLACE FUNCTION reset_all_thumbnails()
RETURNS void AS $$
BEGIN
  -- Clear thumbnail_path in all media_items where it is not null
  UPDATE media_items
  SET thumbnail_path = NULL
  WHERE thumbnail_path IS NOT NULL;
  
  -- Delete all thumbnail-related entries from the processing_states table
  DELETE FROM processing_states
  WHERE type = 'thumbnail';
END;
$$ LANGUAGE plpgsql;

-- Add comment to explain the function
COMMENT ON FUNCTION reset_all_thumbnails() IS 'Resets all thumbnails by clearing thumbnail paths in the media_items table and removing thumbnail entries from the processing_states table.';

-- Ensure proper security on the function
ALTER FUNCTION reset_all_thumbnails() SECURITY DEFINER;

-- Notify the PostgREST server to reload its configuration
NOTIFY pgrst, 'reload config';
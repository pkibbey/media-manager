-- Create a function to reset all thumbnails
CREATE OR REPLACE FUNCTION reset_all_thumbnails()
RETURNS void AS $$
BEGIN
  -- Clear thumbnail_path in all media_items where it exists
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

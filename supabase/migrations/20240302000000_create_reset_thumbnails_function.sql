-- Create a function to reset all thumbnails
CREATE OR REPLACE FUNCTION reset_all_thumbnails()
RETURNS void AS $$
BEGIN
  -- Update all media items to clear both the legacy thumbnail_path field
  -- and the thumbnail portion of the processing_state JSON
  UPDATE media_items
  SET 
    thumbnail_path = NULL,
    processing_state = CASE
      WHEN processing_state IS NULL THEN NULL
      ELSE 
        -- Remove the thumbnail object from the processing state if it exists
        processing_state - 'thumbnail'
    END;
END;
$$ LANGUAGE plpgsql;

-- Add comment to explain the function
COMMENT ON FUNCTION reset_all_thumbnails() IS 'Resets all thumbnails by clearing thumbnail paths both in the legacy field and the processing_state JSON field.';

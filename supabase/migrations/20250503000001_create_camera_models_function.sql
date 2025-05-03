-- Create a function to extract unique camera models from EXIF data
CREATE OR REPLACE FUNCTION get_unique_camera_models()
RETURNS TABLE (camera_model text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT exif_data->'Image'->>'Model' as camera_model
  FROM media_items
  WHERE 
    exif_data IS NOT NULL 
    AND exif_data->'Image'->>'Model' IS NOT NULL
  ORDER BY camera_model;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
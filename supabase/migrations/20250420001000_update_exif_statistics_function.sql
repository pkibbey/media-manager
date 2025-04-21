-- This migration updates the get_exif_statistics function to handle
-- the new database structure where extension is in file_types table
-- instead of directly in media_items

-- Update the EXIF statistics function to use file_types table relationship
CREATE OR REPLACE FUNCTION get_exif_statistics(
  exif_compatible_extensions text[] DEFAULT ARRAY['jpg', 'jpeg', 'tiff', 'heic']
)
RETURNS TABLE (
  with_exif bigint,
  processed_no_exif bigint,
  unprocessed bigint,
  total_compatible bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Count media items with successful EXIF extraction
    COUNT(DISTINCT mi.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM processing_states ps
        WHERE ps.media_item_id = mi.id
        AND ps.type = 'exif'
        AND ps.status = 'success'
      )
    ) AS with_exif,
    
    -- Count media items processed but no EXIF found (skipped or unsupported)
    COUNT(DISTINCT mi.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM processing_states ps
        WHERE ps.media_item_id = mi.id
        AND ps.type = 'exif'
        AND ps.status IN ('skipped', 'unsupported')
      )
    ) AS processed_no_exif,
    
    -- Count unprocessed items compatible with EXIF
    COUNT(DISTINCT mi.id) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM processing_states ps
        WHERE ps.media_item_id = mi.id
        AND ps.type = 'exif'
      )
      AND ft.extension IN (SELECT unnest(exif_compatible_extensions))
    ) AS unprocessed,
    
    -- Total number of compatible files
    COUNT(DISTINCT mi.id) FILTER (
      WHERE ft.extension IN (SELECT unnest(exif_compatible_extensions))
    ) AS total_compatible
    
  FROM media_items mi
  LEFT JOIN file_types ft ON mi.file_type_id = ft.id;
END;
$$;

-- Ensure security settings
ALTER FUNCTION get_exif_statistics(text[]) SECURITY DEFINER;

-- Analyze tables to optimize query planning
ANALYZE media_items;
ANALYZE file_types;
ANALYZE processing_states;

-- Notify the PostgREST server to reload its configuration
NOTIFY pgrst, 'reload config';
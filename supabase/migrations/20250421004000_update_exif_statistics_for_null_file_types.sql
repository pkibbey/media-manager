-- This migration updates the get_exif_statistics function to handle null file_type_id values
-- in media_items table. It uses file paths to infer file extensions when file_type_id is null.

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_exif_statistics;

-- Create the updated function
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
  WITH 
    -- Find all media items with compatible extensions, either by file_type_id or by path
    compatible_media AS (
      SELECT mi.id
      FROM media_items mi
      LEFT JOIN file_types ft ON mi.file_type_id = ft.id
      WHERE 
        -- Either has a compatible file type
        (ft.extension IN (SELECT unnest(exif_compatible_extensions)))
        -- Or file_type_id is null but path has a compatible extension
        OR (
          mi.file_type_id IS NULL 
          AND (
            mi.path ILIKE '%.jpg' OR 
            mi.path ILIKE '%.jpeg' OR 
            mi.path ILIKE '%.tiff' OR 
            mi.path ILIKE '%.heic'
          )
        )
    ),
    -- Find media items with successful EXIF extraction
    successful_exif AS (
      SELECT ps.media_item_id
      FROM processing_states ps
      WHERE ps.type = 'exif' AND ps.status = 'success'
    ),
    -- Find media items that were processed but no EXIF found
    processed_without_exif AS (
      SELECT ps.media_item_id
      FROM processing_states ps
      WHERE ps.type = 'exif' AND ps.status IN ('skipped', 'unsupported')
    ),
    -- Find all media items that have any EXIF processing state
    any_exif_processing AS (
      SELECT ps.media_item_id
      FROM processing_states ps
      WHERE ps.type = 'exif'
    )
  SELECT
    -- Count media items with successful EXIF extraction
    (SELECT COUNT(*) FROM successful_exif) AS with_exif,
    
    -- Count media items processed but no EXIF found
    (SELECT COUNT(*) FROM processed_without_exif) AS processed_no_exif,
    
    -- Count unprocessed items compatible with EXIF
    (SELECT COUNT(*) FROM compatible_media cm 
     WHERE NOT EXISTS (SELECT 1 FROM any_exif_processing aep WHERE aep.media_item_id = cm.id)) AS unprocessed,
    
    -- Total number of compatible files
    (SELECT COUNT(*) FROM compatible_media) AS total_compatible;
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
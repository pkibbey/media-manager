-- This migration adds a function to get unprocessed EXIF files efficiently
-- to solve the URI too long error when there are many processed files

-- Create function to efficiently retrieve unprocessed EXIF files
CREATE OR REPLACE FUNCTION get_unprocessed_exif_files(
  exif_supported_ids int[],
  ignored_ids int[] DEFAULT '{}'::int[],
  page_number int DEFAULT 0,
  page_size int DEFAULT 500
)
RETURNS TABLE (
  id uuid,
  file_path text,
  file_type_id int,
  file_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.file_path,
    mi.file_type_id,
    mi.file_name
  FROM media_items mi
  WHERE 
    -- File has a supported EXIF type
    mi.file_type_id = ANY(exif_supported_ids)
    -- File is not in the ignored types
    AND NOT (mi.file_type_id = ANY(ignored_ids))
    -- File hasn't been processed yet (no entry in processing_states)
    AND NOT EXISTS (
      SELECT 1 
      FROM processing_states ps
      WHERE ps.media_item_id = mi.id
      AND ps.type = 'exif'
      AND ps.status IN ('success', 'skipped', 'unsupported')
    )
  ORDER BY mi.id
  LIMIT page_size
  OFFSET page_number * page_size;
END;
$$;

-- Ensure proper security settings
ALTER FUNCTION get_unprocessed_exif_files(int[], int[], int, int) SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_unprocessed_exif_files IS 'Get unprocessed EXIF files in a paginated manner without URI length limitations';

-- Analyze tables to optimize query planning
ANALYZE media_items;
ANALYZE processing_states;

-- Notify the PostgREST server to reload its configuration
NOTIFY pgrst, 'reload config';
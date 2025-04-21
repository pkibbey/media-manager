-- This migration adds a specialized function to count unprocessed EXIF files efficiently
-- without hitting URL length limits when there are many processed IDs

-- Create function to efficiently count unprocessed exif files
CREATE OR REPLACE FUNCTION count_unprocessed_exif_files(
  exif_supported_ids int[],
  ignored_ids int[] DEFAULT '{}'::int[]
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result bigint;
BEGIN
  -- Count media items that:
  -- 1. Have a compatible file type (in exif_supported_ids)
  -- 2. Are not ignored (not in ignored_ids)
  -- 3. Don't have any processing state for EXIF processing 
  SELECT COUNT(*) INTO count_result
  FROM media_items mi
  WHERE 
    mi.file_type_id = ANY(exif_supported_ids)
    AND NOT (mi.file_type_id = ANY(ignored_ids))
    AND NOT EXISTS (
      SELECT 1 
      FROM processing_states ps
      WHERE ps.media_item_id = mi.id
      AND ps.type = 'exif'
    );
  
  RETURN count_result;
END;
$$;

-- Ensure proper security on the function
ALTER FUNCTION count_unprocessed_exif_files(int[], int[]) SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION count_unprocessed_exif_files IS 'Efficiently count media items that need EXIF processing';

-- Analyze tables to optimize query planning
ANALYZE media_items;
ANALYZE processing_states;

-- Notify the PostgREST server to reload its configuration
NOTIFY pgrst, 'reload config';
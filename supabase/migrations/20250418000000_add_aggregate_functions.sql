-- Enable aggregate functions (required for these optimizations)
ALTER ROLE authenticator SET pgrst.db_aggregates_enabled = 'true'; 
NOTIFY pgrst, 'reload config';

-- Create a function to optimize folder media counting
CREATE OR REPLACE FUNCTION count_folder_media(
  target_folder text,
  include_subfolders boolean
) 
RETURNS TABLE (
  current_folder_count bigint,
  subfolder_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE folder_path = target_folder) AS current_folder_count,
    COUNT(*) FILTER (WHERE folder_path LIKE target_folder || '/%') AS subfolder_count;
END;
$$;

-- Create a function for media statistics that combines multiple count queries
-- Updated to use processing_states table rather than legacy processing_state column
CREATE OR REPLACE FUNCTION get_media_statistics()
RETURNS TABLE (
  total_count bigint,
  total_size_bytes numeric,
  processed_count bigint,
  unprocessed_count bigint,
  organized_count bigint,
  unorganized_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed_statuses text[] := ARRAY['success', 'skipped', 'unsupported']; -- Define final processing statuses
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) AS total_count,
    COALESCE(SUM(size_bytes), 0) AS total_size_bytes,
    -- Count as processed if exif status is one of the final statuses
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM processing_states ps 
        WHERE ps.media_item_id = media_items.id 
        AND ps.type = 'exif' 
        AND ps.status = ANY(processed_statuses)
      )
    ) AS processed_count,
    -- Count as unprocessed if no exif processing_states entry exists with final status
    COUNT(*) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM processing_states ps 
        WHERE ps.media_item_id = media_items.id 
        AND ps.type = 'exif' 
        AND ps.status = ANY(processed_statuses)
      )
    ) AS unprocessed_count,
    -- Keep organized logic based on folder structure or other criteria
    -- This is a placeholder - replace with actual logic for "organized"
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM processing_states ps 
        WHERE ps.media_item_id = media_items.id 
        AND ps.type = 'dateCorrection' 
        AND ps.status = 'success'
      )
    ) AS organized_count,
    -- Files not yet organized
    COUNT(*) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM processing_states ps 
        WHERE ps.media_item_id = media_items.id 
        AND ps.type = 'dateCorrection' 
        AND ps.status = 'success'
      )
    ) AS unorganized_count
  FROM media_items;
END;
$$;

-- Create a function for EXIF statistics
-- Updated to use file_type_id instead of extension
CREATE OR REPLACE FUNCTION get_exif_statistics()
RETURNS TABLE (
  with_exif bigint,
  processed_no_exif bigint,
  unprocessed bigint,
  total_compatible bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exif_compatible_ids int[];
BEGIN
  -- Get IDs of file types that are EXIF compatible
  SELECT array_agg(id) INTO exif_compatible_ids
  FROM file_types
  WHERE extension IN ('jpg', 'jpeg', 'tiff', 'heic');

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
      AND mi.file_type_id = ANY(exif_compatible_ids)
    ) AS unprocessed,
    
    -- Total number of compatible files
    COUNT(DISTINCT mi.id) FILTER (
      WHERE mi.file_type_id = ANY(exif_compatible_ids)
    ) AS total_compatible
    
  FROM media_items mi;
END;
$$;

-- Create a function for getting extension counts with categories
CREATE OR REPLACE FUNCTION get_extension_statistics()
RETURNS TABLE (
  extension text,
  count bigint,
  category text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.extension,
    COUNT(*) AS count,
    COALESCE(ft.category, 'other') AS category
  FROM 
    media_items mi
    JOIN file_types ft ON mi.file_type_id = ft.id
  GROUP BY 
    ft.extension, ft.category
  ORDER BY 
    count DESC;
END;
$$;

-- Add appropriate row level security policies
ALTER FUNCTION count_folder_media(text, boolean) SECURITY DEFINER;
ALTER FUNCTION get_media_statistics() SECURITY DEFINER;
ALTER FUNCTION get_exif_statistics() SECURITY DEFINER;
ALTER FUNCTION get_extension_statistics() SECURITY DEFINER;

-- Optimize database with improved execution plans
ANALYZE media_items;
ANALYZE processing_states;
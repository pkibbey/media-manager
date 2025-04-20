-- Enable aggregate functions (required for these optimizations)
ALTER ROLE authenticator SET pgrst.db_aggregates_enabled = 'true'; 
NOTIFY pgrst, 'reload config';

-- Create a function to optimize folder media counting
CREATE OR REPLACE FUNCTION count_folder_media(
  target_folder text,
  include_subfolders boolean,
  ignore_extensions text[] DEFAULT NULL
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
    COUNT(*) FILTER (WHERE folder_path = target_folder AND 
                      (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS current_folder_count,
    COUNT(*) FILTER (WHERE folder_path LIKE target_folder || '/%' AND 
                      (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS subfolder_count;
END;
$$;

-- Create a function for media statistics that combines multiple count queries
-- Updated to use processing_states table rather than legacy processing_state column
CREATE OR REPLACE FUNCTION get_media_statistics(ignore_extensions text[] DEFAULT NULL)
RETURNS TABLE (
  total_count bigint,
  total_size_bytes bigint,
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
    COUNT(*) FILTER (WHERE ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions))) AS total_count,
    COALESCE(SUM(size_bytes) FILTER (WHERE ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions))), 0) AS total_size_bytes,
    -- Count as processed if exif status is one of the final statuses
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM processing_states ps 
        WHERE ps.media_item_id = media_items.id 
        AND ps.type = 'exif' 
        AND ps.status = ANY(processed_statuses)
      )
      AND (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))
    ) AS processed_count,
    -- Count as unprocessed if no exif processing_states entry exists with final status
    COUNT(*) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM processing_states ps 
        WHERE ps.media_item_id = media_items.id 
        AND ps.type = 'exif' 
        AND ps.status = ANY(processed_statuses)
      )
      AND (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))
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
      AND (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))
    ) AS organized_count,
    -- Files not yet organized
    COUNT(*) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM processing_states ps 
        WHERE ps.media_item_id = media_items.id 
        AND ps.type = 'dateCorrection' 
        AND ps.status = 'success'
      )
      AND (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))
    ) AS unorganized_count
  FROM media_items;
END;
$$;

-- Create a function for EXIF statistics
-- Updated to use processing_states table 
CREATE OR REPLACE FUNCTION get_exif_statistics(
  ignore_extensions text[] DEFAULT NULL,
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
      AND (ignore_extensions IS NULL OR mi.extension NOT IN (SELECT unnest(ignore_extensions)))
    ) AS with_exif,
    
    -- Count media items processed but no EXIF found (skipped or unsupported)
    COUNT(DISTINCT mi.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM processing_states ps
        WHERE ps.media_item_id = mi.id
        AND ps.type = 'exif'
        AND ps.status IN ('skipped', 'unsupported')
      )
      AND (ignore_extensions IS NULL OR mi.extension NOT IN (SELECT unnest(ignore_extensions)))
    ) AS processed_no_exif,
    
    -- Count unprocessed items compatible with EXIF
    COUNT(DISTINCT mi.id) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM processing_states ps
        WHERE ps.media_item_id = mi.id
        AND ps.type = 'exif'
      )
      AND mi.extension IN (SELECT unnest(exif_compatible_extensions))
      AND (ignore_extensions IS NULL OR mi.extension NOT IN (SELECT unnest(ignore_extensions)))
    ) AS unprocessed,
    
    -- Total number of compatible files
    COUNT(DISTINCT mi.id) FILTER (
      WHERE mi.extension IN (SELECT unnest(exif_compatible_extensions))
      AND (ignore_extensions IS NULL OR mi.extension NOT IN (SELECT unnest(ignore_extensions)))
    ) AS total_compatible
    
  FROM media_items mi;
END;
$$;

-- Create a function for getting extension counts with categories
CREATE OR REPLACE FUNCTION get_extension_statistics(ignore_extensions text[] DEFAULT NULL)
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
    mi.extension,
    COUNT(*) AS count,
    COALESCE(ft.category, 'other') AS category
  FROM 
    media_items mi
    LEFT JOIN file_types ft ON mi.extension = ft.extension
  WHERE 
    (ignore_extensions IS NULL OR mi.extension NOT IN (SELECT unnest(ignore_extensions)))
  GROUP BY 
    mi.extension, ft.category
  ORDER BY 
    count DESC;
END;
$$;

-- Add appropriate row level security policies
ALTER FUNCTION count_folder_media(text, boolean, text[]) SECURITY DEFINER;
ALTER FUNCTION get_media_statistics(text[]) SECURITY DEFINER;
ALTER FUNCTION get_exif_statistics(text[], text[]) SECURITY DEFINER;
ALTER FUNCTION get_extension_statistics(text[]) SECURITY DEFINER;

-- Optimize database with improved execution plans
ANALYZE media_items;
ANALYZE processing_states;
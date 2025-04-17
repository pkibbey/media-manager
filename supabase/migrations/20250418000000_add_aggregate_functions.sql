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
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions))) AS total_count,
    SUM(size_bytes) FILTER (WHERE ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions))) AS total_size_bytes,
    COUNT(*) FILTER (WHERE processed = true AND (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS processed_count,
    COUNT(*) FILTER (WHERE processed = false AND (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS unprocessed_count,
    COUNT(*) FILTER (WHERE organized = true AND (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS organized_count,
    COUNT(*) FILTER (WHERE organized = false AND (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS unorganized_count
  FROM media_items;
END;
$$;

-- Create a function for EXIF statistics
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
    COUNT(*) FILTER (WHERE has_exif = true AND 
                     (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS with_exif,
    COUNT(*) FILTER (WHERE processed = true AND has_exif = false AND 
                     (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS processed_no_exif,
    COUNT(*) FILTER (WHERE processed = false AND 
                     extension IN (SELECT unnest(exif_compatible_extensions)) AND
                     (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS unprocessed,
    COUNT(*) FILTER (WHERE extension IN (SELECT unnest(exif_compatible_extensions)) AND
                     (ignore_extensions IS NULL OR extension NOT IN (SELECT unnest(ignore_extensions)))) AS total_compatible
  FROM media_items;
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
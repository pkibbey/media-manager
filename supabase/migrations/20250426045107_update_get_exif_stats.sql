-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_exif_stats();

-- Create new function with updated return type (removed skipped count)
CREATE OR REPLACE FUNCTION public.get_exif_stats()
RETURNS TABLE(
  total int,
  success int,
  failed int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*) FILTER (
      WHERE ft.category IN ('image', 'video') AND ft.ignore = false
    ) AS total,
    count(*) FILTER (
      WHERE ft.category IN ('image', 'video') AND ft.ignore = false
        AND ps.type = 'exif' AND ps.status = 'success'
    ) AS success,
    count(*) FILTER (
      WHERE ft.category IN ('image', 'video') AND ft.ignore = false
        AND ps.type = 'exif' AND ps.status = 'error'
    ) AS failed
  FROM media_items mi
  JOIN file_types ft ON mi.file_type_id = ft.id
  LEFT JOIN processing_states ps ON mi.id = ps.media_item_id AND ps.type = 'exif';
END;
$$ LANGUAGE plpgsql;

-- Set appropriate permissions
ALTER FUNCTION public.get_exif_stats() SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.get_exif_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exif_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exif_stats() TO service_role;
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_thumbnail_stats();

-- Create new function that returns thumbnail statistics
CREATE OR REPLACE FUNCTION public.get_thumbnail_stats()
RETURNS TABLE(
  total int,
  success int,
  failed int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*) FILTER (
      WHERE ft.category = 'image' AND ft.ignore = false
    ) AS total,
    count(*) FILTER (
      WHERE ft.category = 'image' AND ft.ignore = false
        AND ps.type = 'thumbnail' AND ps.status = 'complete'
    ) AS success,
    count(*) FILTER (
      WHERE ft.category = 'image' AND ft.ignore = false
        AND ps.type = 'thumbnail' AND ps.status = 'failure'
    ) AS failed
  FROM media_items mi
  JOIN file_types ft ON mi.file_type_id = ft.id
  LEFT JOIN processing_states ps ON mi.id = ps.media_item_id AND ps.type = 'thumbnail';
END;
$$ LANGUAGE plpgsql;

-- Set appropriate permissions
ALTER FUNCTION public.get_thumbnail_stats() SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.get_thumbnail_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thumbnail_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_thumbnail_stats() TO service_role;
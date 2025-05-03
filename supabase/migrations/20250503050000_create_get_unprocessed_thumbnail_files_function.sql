-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_unprocessed_thumbnail_files(int);

-- Create new function that returns unprocessed files for thumbnails
CREATE OR REPLACE FUNCTION public.get_unprocessed_thumbnail_files(limit_count int)
RETURNS TABLE (
  id uuid,
  file_name text,
  file_path text,
  file_type_id int,
  thumbnail_path text,
  file_types jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.file_name,
    mi.file_path,
    mi.file_type_id,
    mi.thumbnail_path,
    jsonb_build_object(
      'id', ft.id,
      'category', ft.category,
      'ignore', ft.ignore,
      'extension', ft.extension
    ) as file_types
  FROM media_items mi
  JOIN file_types ft ON mi.file_type_id = ft.id
  WHERE ft.category = 'image' 
    AND ft.ignore = false
    AND mi.thumbnail_path IS NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM processing_states ps 
      WHERE ps.media_item_id = mi.id 
        AND ps.type = 'thumbnail'
    )
  ORDER BY mi.created_at ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Set appropriate permissions
ALTER FUNCTION public.get_unprocessed_thumbnail_files(int) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.get_unprocessed_thumbnail_files(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unprocessed_thumbnail_files(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unprocessed_thumbnail_files(int) TO service_role;
-- Create function to retrieve media items with filtering
CREATE OR REPLACE FUNCTION public.get_media_items(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'all',
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_min_size INTEGER DEFAULT 0,
  p_max_size INTEGER DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_date',
  p_sort_order TEXT DEFAULT 'desc',
  p_has_exif TEXT DEFAULT 'all',
  p_camera TEXT DEFAULT 'all',
  p_has_location TEXT DEFAULT 'all',
  p_has_thumbnail TEXT DEFAULT 'all'
)
RETURNS TABLE (
  items JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_query text;
  v_count_query text;
  v_filter_conditions text := ' WHERE file_types.ignore = false';
  v_count BIGINT;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_page_size;
  
  -- Base query - join media_items with file_types, using DISTINCT ON to ensure uniqueness
  -- Explicitly alias each column to prevent id field collision
  v_query := 'SELECT DISTINCT ON (media_items.id) 
    media_items.id,
    media_items.created_date,
    media_items.file_name,
    media_items.file_path,
    media_items.file_type_id,
    media_items.size_bytes,
    media_items.exif_data,
    media_items.thumbnail_path,
    media_items.camera,
    file_types.id as file_type_id,
    file_types.extension,
    file_types.mimetype,
    file_types.category,
    file_types.description,
    file_types.ignore
  FROM media_items 
  INNER JOIN file_types ON media_items.file_type_id = file_types.id';
  
  -- Apply camera filter
  IF p_camera IS NOT NULL AND p_camera <> 'all' THEN
    v_filter_conditions := v_filter_conditions || ' AND camera = ' || quote_literal(p_camera);
  END IF;
  
  -- Apply date filters
  IF p_date_from IS NOT NULL THEN
    v_filter_conditions := v_filter_conditions || ' AND created_date >= ' || quote_literal(p_date_from);
  END IF;
  
  IF p_date_to IS NOT NULL THEN
    v_filter_conditions := v_filter_conditions || ' AND created_date <= ' || quote_literal(p_date_to);
  END IF;
  
  -- Apply category/type filter
  IF p_type IS NOT NULL AND p_type <> 'all' THEN
    v_filter_conditions := v_filter_conditions || ' AND file_types.category = ' || quote_literal(p_type);
  END IF;
  
  -- Apply thumbnail filter
  IF p_has_thumbnail IS NOT NULL AND p_has_thumbnail <> 'all' THEN
    IF p_has_thumbnail = 'yes' THEN
      v_filter_conditions := v_filter_conditions || ' AND thumbnail_path IS NOT NULL';
    ELSE
      v_filter_conditions := v_filter_conditions || ' AND thumbnail_path IS NULL';
    END IF;
  END IF;
  
  -- Apply EXIF filter
  IF p_has_exif IS NOT NULL AND p_has_exif <> 'all' THEN
    IF p_has_exif = 'yes' THEN
      v_filter_conditions := v_filter_conditions || ' AND exif_data IS NOT NULL AND exif_data::text <> ''{}''';
    ELSE
      v_filter_conditions := v_filter_conditions || ' AND (exif_data IS NULL OR exif_data::text = ''{}'')';
    END IF;
  END IF;
  
  -- Apply size filters
  IF p_min_size IS NOT NULL AND p_min_size > 0 THEN
    v_filter_conditions := v_filter_conditions || ' AND size_bytes >= ' || (p_min_size * 1024 * 1024)::text; -- Convert MB to bytes
  END IF;
  
  IF p_max_size IS NOT NULL THEN
    v_filter_conditions := v_filter_conditions || ' AND size_bytes <= ' || (p_max_size * 1024 * 1024)::text; -- Convert MB to bytes
  END IF;
  
  -- Apply search filter
  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_filter_conditions := v_filter_conditions || ' AND file_name ILIKE ' || quote_literal('%' || p_search || '%');
  END IF;
  
  -- Apply location filter
  IF p_has_location IS NOT NULL AND p_has_location <> 'all' THEN
    IF p_has_location = 'yes' THEN
      v_filter_conditions := v_filter_conditions || ' AND (exif_data IS NOT NULL AND (exif_data->>''GPSLatitude'') IS NOT NULL)';
    ELSE
      v_filter_conditions := v_filter_conditions || ' AND (exif_data IS NULL OR (exif_data->>''GPSLatitude'') IS NULL)';
    END IF;
  END IF;
  
  -- Combine base query with filters
  v_query := v_query || v_filter_conditions;
  
  -- Create count query for pagination - needs a subquery to respect the DISTINCT ON
  v_count_query := 'SELECT COUNT(*) FROM (SELECT DISTINCT media_items.id FROM media_items INNER JOIN file_types ON media_items.file_type_id = file_types.id' || v_filter_conditions || ') as count_query';
  
  -- Execute count query
  EXECUTE v_count_query INTO v_count;
  
  -- When using DISTINCT ON, we need to explicitly specify the first sort key
  -- to match the column in the DISTINCT ON clause
  v_query := v_query || ' ORDER BY media_items.id';
  
  -- Add additional sorting after the DISTINCT ON ordering
  IF p_sort_by IS NOT NULL THEN
    v_query := v_query || ', ' || quote_ident(p_sort_by);
    
    -- Add sort order
    IF p_sort_order = 'asc' THEN
      v_query := v_query || ' ASC';
    ELSE
      v_query := v_query || ' DESC';
    END IF;
  END IF;
  
  -- Add pagination
  v_query := v_query || ' LIMIT ' || p_page_size::text || ' OFFSET ' || v_offset::text;
  
  -- Return the results as a single row with two columns:
  -- 1. items: a JSON array of media items
  -- 2. total_count: the total count of items matching the filter
  RETURN QUERY EXECUTE 
    'SELECT 
       COALESCE(jsonb_agg(row_to_json(t)::jsonb), ''[]''::jsonb) as items, 
       ' || v_count || '::bigint as total_count
     FROM (' || v_query || ') t';
END;
$$;

-- Set appropriate privileges
ALTER FUNCTION public.get_media_items SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.get_media_items FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_media_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_items TO service_role;
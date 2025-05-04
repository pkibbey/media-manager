-- Add new columns to track media item visibility status
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Add indexes for the new columns for better query performance
CREATE INDEX IF NOT EXISTS idx_media_items_is_deleted ON public.media_items(is_deleted);
CREATE INDEX IF NOT EXISTS idx_media_items_is_hidden ON public.media_items(is_hidden);

-- Update the existing get_media_items function to include visibility filters
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
  p_has_location TEXT DEFAULT 'all',
  p_has_thumbnail TEXT DEFAULT 'all',
  p_include_hidden BOOLEAN DEFAULT FALSE,
  p_include_deleted BOOLEAN DEFAULT FALSE
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
  v_sort_column text;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_page_size;
  
  -- Add visibility filters
  v_filter_conditions := v_filter_conditions || ' AND (media_items.is_deleted = FALSE OR ' || p_include_deleted::TEXT || ' = TRUE)';
  v_filter_conditions := v_filter_conditions || ' AND (media_items.is_hidden = FALSE OR ' || p_include_hidden::TEXT || ' = TRUE)';
  
  -- Base query - join media_items with file_types, using DISTINCT ON to ensure uniqueness
  -- Explicitly alias each column to prevent id field collision
  v_query := 'SELECT DISTINCT ON (media_items.id) 
    media_items.id,
    media_items.created_date,
    media_items.file_name,
    media_items.file_path,
    media_items.file_type_id as item_type_id,
    media_items.size_bytes,
    media_items.exif_data,
    media_items.thumbnail_path,
    media_items.folder_path,
    media_items.is_deleted,
    media_items.is_hidden,
    file_types.id as file_type_id,
    file_types.extension,
    file_types.category,
    file_types.ignore
  FROM media_items 
  INNER JOIN file_types ON media_items.file_type_id = file_types.id';
    
  -- Apply date filters
  IF p_date_from IS NOT NULL THEN
    v_filter_conditions := v_filter_conditions || ' AND media_items.created_date >= ' || quote_literal(p_date_from);
  END IF;
  
  IF p_date_to IS NOT NULL THEN
    v_filter_conditions := v_filter_conditions || ' AND media_items.created_date <= ' || quote_literal(p_date_to);
  END IF;
  
  -- Apply category/type filter
  IF p_type IS NOT NULL AND p_type <> 'all' THEN
    v_filter_conditions := v_filter_conditions || ' AND file_types.category = ' || quote_literal(p_type);
  END IF;
  
  -- Apply thumbnail filter
  IF p_has_thumbnail IS NOT NULL AND p_has_thumbnail <> 'all' THEN
    IF p_has_thumbnail = 'yes' THEN
      v_filter_conditions := v_filter_conditions || ' AND media_items.thumbnail_path IS NOT NULL';
    ELSE
      v_filter_conditions := v_filter_conditions || ' AND media_items.thumbnail_path IS NULL';
    END IF;
  END IF;
  
  -- Apply EXIF filter
  IF p_has_exif IS NOT NULL AND p_has_exif <> 'all' THEN
    IF p_has_exif = 'yes' THEN
      v_filter_conditions := v_filter_conditions || ' AND media_items.exif_data IS NOT NULL AND media_items.exif_data::text <> ''{}''';
    ELSE
      v_filter_conditions := v_filter_conditions || ' AND (media_items.exif_data IS NULL OR media_items.exif_data::text = ''{}'')';
    END IF;
  END IF;
  
  -- Apply size filters
  IF p_min_size IS NOT NULL AND p_min_size > 0 THEN
    v_filter_conditions := v_filter_conditions || ' AND media_items.size_bytes >= ' || (p_min_size * 1024 * 1024)::text; -- Convert MB to bytes
  END IF;
  
  IF p_max_size IS NOT NULL THEN
    v_filter_conditions := v_filter_conditions || ' AND media_items.size_bytes <= ' || (p_max_size * 1024 * 1024)::text; -- Convert MB to bytes
  END IF;
  
  -- Apply search filter
  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_filter_conditions := v_filter_conditions || ' AND media_items.file_name ILIKE ' || quote_literal('%' || p_search || '%');
  END IF;
  
  -- Apply location filter
  IF p_has_location IS NOT NULL AND p_has_location <> 'all' THEN
    IF p_has_location = 'yes' THEN
      v_filter_conditions := v_filter_conditions || ' AND (media_items.exif_data IS NOT NULL AND (media_items.exif_data->>''GPSLatitude'') IS NOT NULL)';
    ELSE
      v_filter_conditions := v_filter_conditions || ' AND (media_items.exif_data IS NULL OR (media_items.exif_data->>''GPSLatitude'') IS NULL)';
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
  
  -- Map sorting parameter to actual column name
  -- This ensures we use the correct table prefix for columns
  IF p_sort_by = 'created_date' THEN
    v_sort_column := 'media_items.created_date';
  ELSIF p_sort_by = 'file_name' THEN
    v_sort_column := 'media_items.file_name';
  ELSIF p_sort_by = 'size_bytes' THEN
    v_sort_column := 'media_items.size_bytes';
  ELSIF p_sort_by = 'type' THEN
    v_sort_column := 'file_types.category';
  ELSE
    -- Default to created_date if an invalid sort column is provided
    v_sort_column := 'media_items.created_date';
  END IF;
  
  -- Add sort column and direction
  v_query := v_query || ', ' || v_sort_column;
  
  -- Add sort order
  IF p_sort_order = 'asc' THEN
    v_query := v_query || ' ASC';
  ELSE
    v_query := v_query || ' DESC';
  END IF;
  
  -- Add pagination
  v_query := v_query || ' LIMIT ' || p_page_size::text || ' OFFSET ' || v_offset::text;
  
  -- For debugging
  -- RAISE NOTICE 'SQL Query: %', v_query;
  
  -- Return the results as a single row with two columns:
  -- 1. items: a JSON array of media items
  -- 2. total_count: the total count of items matching the filter
  RETURN QUERY EXECUTE 
    'SELECT 
       COALESCE(jsonb_agg(
         jsonb_build_object(
           ''id'', t.id, 
           ''created_date'', t.created_date,
           ''file_name'', t.file_name,
           ''file_path'', t.file_path, 
           ''file_type_id'', t.item_type_id,
           ''size_bytes'', t.size_bytes,
           ''exif_data'', t.exif_data,
           ''thumbnail_path'', t.thumbnail_path,
           ''folder_path'', t.folder_path,
           ''is_deleted'', t.is_deleted,
           ''is_hidden'', t.is_hidden,
           ''file_types'', jsonb_build_object(
             ''id'', t.file_type_id,
             ''extension'', t.extension,
             ''category'', t.category, 
             ''ignore'', t.ignore
           )
         )
       ), ''[]''::jsonb) as items, 
       ' || v_count || '::bigint as total_count
     FROM (' || v_query || ') t';
END;
$$;

-- Create function to update media visibility
CREATE OR REPLACE FUNCTION public.update_media_visibility(
  p_media_id UUID,
  p_is_deleted BOOLEAN DEFAULT NULL,
  p_is_hidden BOOLEAN DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update visibility flags
  UPDATE media_items
  SET 
    is_deleted = COALESCE(p_is_deleted, is_deleted),
    is_hidden = COALESCE(p_is_hidden, is_hidden)
  WHERE id = p_media_id;
END;
$$ LANGUAGE plpgsql;

-- Set appropriate permissions
ALTER FUNCTION public.update_media_visibility(UUID, BOOLEAN, BOOLEAN) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.update_media_visibility(UUID, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_media_visibility(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_media_visibility(UUID, BOOLEAN, BOOLEAN) TO service_role;
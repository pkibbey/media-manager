-- Create function to clear all exif_data from media_items
CREATE OR REPLACE FUNCTION public.clear_all_exif_data()
RETURNS TABLE (
  affected_rows BIGINT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected_rows BIGINT;
  v_status TEXT;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_duration INTERVAL;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Update all media items, setting exif_data to null
  -- Include a WHERE clause to only update rows where exif_data is not null
  UPDATE public.media_items
  SET exif_data = NULL
  WHERE exif_data IS NOT NULL;
  
  -- Get number of affected rows
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  
  v_end_time := clock_timestamp();
  v_duration := v_end_time - v_start_time;
  
  v_status := 'Successfully cleared exif_data from ' || v_affected_rows || 
              ' media items in ' || v_duration::TEXT;
  
  -- Return result stats
  RETURN QUERY SELECT v_affected_rows, v_status;
END;
$$;

-- Set appropriate privileges
ALTER FUNCTION public.clear_all_exif_data SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.clear_all_exif_data FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_all_exif_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_all_exif_data TO service_role;
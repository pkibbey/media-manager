-- This migration adds a function to calculate the sum of all file sizes in the media_items table
-- This is used by the stats system to display total storage used

-- Create the sum_file_sizes function
CREATE OR REPLACE FUNCTION sum_file_sizes()
RETURNS TABLE (sum numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(size_bytes), 0) AS sum
  FROM media_items;
END;
$$;

-- Add appropriate security
ALTER FUNCTION sum_file_sizes() SECURITY DEFINER;

-- Ensure aggregate functions are still enabled
NOTIFY pgrst, 'reload config';
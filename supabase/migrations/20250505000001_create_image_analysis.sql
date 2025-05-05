-- Create image analysis table
CREATE TABLE image_analysis (
  id BIGSERIAL PRIMARY KEY,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  objects TEXT[] NOT NULL DEFAULT '{}',
  scene_type TEXT,
  colors TEXT[] NOT NULL DEFAULT '{}',
  processing_state TEXT NOT NULL DEFAULT 'pending',
  processing_started TIMESTAMP WITH TIME ZONE,
  processing_completed TIMESTAMP WITH TIME ZONE,
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_image_analysis_media_item_id ON image_analysis(media_item_id);
CREATE INDEX idx_image_analysis_processing_state ON image_analysis(processing_state);

-- Create function to get analysis stats
CREATE OR REPLACE FUNCTION get_analysis_stats()
RETURNS TABLE (
  total BIGINT,
  success BIGINT,
  failed BIGINT,
  pending BIGINT,
  completion_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(mi.id)::BIGINT as total_images,
      COUNT(ia.id) FILTER (WHERE ia.processing_state = 'completed')::BIGINT as completed,
      COUNT(ia.id) FILTER (WHERE ia.processing_state = 'error')::BIGINT as failed,
      COUNT(ia.id) FILTER (WHERE ia.processing_state = 'pending' OR ia.processing_state = 'processing')::BIGINT as pending
    FROM
      media_items mi
    LEFT JOIN
      image_analysis ia ON mi.id = ia.media_item_id
    WHERE
      mi.file_types->>'category' = 'image'
  )
  SELECT
    total_images as total,
    completed as success,
    failed,
    pending,
    CASE
      WHEN total_images = 0 THEN 0
      ELSE ROUND((completed * 100.0) / total_images, 1)
    END as completion_percentage
  FROM
    stats;
END;
$$ LANGUAGE plpgsql;

-- Function to get unprocessed files for analysis
CREATE OR REPLACE FUNCTION get_unprocessed_analysis_files(limit_param INT)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_path TEXT,
  file_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.id,
    mi.file_name,
    mi.file_path,
    mi.file_types
  FROM
    media_items mi
  LEFT JOIN
    image_analysis ia ON mi.id = ia.media_item_id
  WHERE
    mi.file_types->>'category' = 'image'
    AND (
      ia.id IS NULL OR
      ia.processing_state = 'error'
    )
  ORDER BY
    mi.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;
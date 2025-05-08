-- Add sentiment, quality score, and safety fields to image_analysis table
ALTER TABLE image_analysis ADD COLUMN IF NOT EXISTS sentiment TEXT;
ALTER TABLE image_analysis ADD COLUMN IF NOT EXISTS quality_score NUMERIC;
ALTER TABLE image_analysis ADD COLUMN IF NOT EXISTS safety_issues TEXT[] DEFAULT '{}';

-- Update get_analysis_stats function to include quality score metrics
CREATE OR REPLACE FUNCTION get_analysis_stats()
RETURNS TABLE (
  total BIGINT,
  success BIGINT,
  failed BIGINT,
  pending BIGINT,
  completion_percentage NUMERIC,
  avg_quality_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(mi.id)::BIGINT as total_images,
      COUNT(ia.id) FILTER (WHERE ia.processing_state = 'completed')::BIGINT as completed,
      COUNT(ia.id) FILTER (WHERE ia.processing_state = 'error')::BIGINT as failed,
      COUNT(ia.id) FILTER (WHERE ia.processing_state = 'pending' OR ia.processing_state = 'processing')::BIGINT as pending,
      AVG(ia.quality_score) FILTER (WHERE ia.quality_score IS NOT NULL) as avg_quality
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
    END as completion_percentage,
    COALESCE(ROUND(avg_quality, 1), 0) as avg_quality_score
  FROM
    stats;
END;
$$ LANGUAGE plpgsql;
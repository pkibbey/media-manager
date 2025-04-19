-- Drop the search_media_by_keywords function
DROP FUNCTION IF EXISTS search_media_by_keywords;

-- Drop the has_detection column from media_items table
ALTER TABLE public.media_items DROP COLUMN IF EXISTS has_detection;

-- Drop the detection_results and failed_detections tables
DROP TABLE IF EXISTS public.failed_detections;
DROP TABLE IF EXISTS public.detection_results;

-- Drop indexes if they still exist
DROP INDEX IF EXISTS idx_media_items_has_detection;
DROP INDEX IF EXISTS idx_failed_detections_media_id;
DROP INDEX IF EXISTS idx_detection_results_media_id;
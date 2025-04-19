-- Add detection_results table
CREATE TABLE IF NOT EXISTS public.detection_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    detected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    detection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    detection_method TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index on media_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_detection_results_media_id ON public.detection_results(media_id);

-- Add failed_detections table to track failed detection analysis jobs
CREATE TABLE IF NOT EXISTS public.failed_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    error TEXT,
    extension TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index on media_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_failed_detections_media_id ON public.failed_detections(media_id);

-- Add has_detection column to media_items table to track if an item has been analyzed
ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS has_detection BOOLEAN DEFAULT NULL;

-- Create index on has_detection for faster filtering
CREATE INDEX IF NOT EXISTS idx_media_items_has_detection ON public.media_items(has_detection);

-- Add function to search media by detected items/keywords
CREATE OR REPLACE FUNCTION search_media_by_keywords(search_terms TEXT[])
RETURNS TABLE (media_id UUID, match_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.media_id,
        COUNT(DISTINCT term)::INTEGER AS match_count
    FROM
        public.detection_results dr,
        jsonb_array_elements(dr.detected_items) AS item,
        unnest(search_terms) AS term
    WHERE
        -- Case insensitive search against the label field
        lower(item->>'label') LIKE '%' || lower(term) || '%'
    GROUP BY
        dr.media_id
    ORDER BY
        match_count DESC;
END;
$$ LANGUAGE plpgsql;
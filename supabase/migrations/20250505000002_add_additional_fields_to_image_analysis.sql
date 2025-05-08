-- Add additional fields to image_analysis table to store vision LLM data
ALTER TABLE image_analysis ADD COLUMN IF NOT EXISTS camera_info TEXT;
ALTER TABLE image_analysis ADD COLUMN IF NOT EXISTS full_analysis TEXT;
ALTER TABLE image_analysis ADD COLUMN IF NOT EXISTS quality_score NUMERIC;
ALTER TABLE image_analysis ADD COLUMN IF NOT EXISTS safety_issues TEXT[] DEFAULT '{}';

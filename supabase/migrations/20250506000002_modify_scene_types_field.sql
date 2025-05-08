-- Rename scene_type to scene_types and change to array type
-- First add the new column
ALTER TABLE image_analysis ADD COLUMN IF NOT EXISTS scene_types TEXT[] DEFAULT '{}';

-- Copy data from old column to new column (convert text to array)
UPDATE image_analysis SET scene_types = 
  CASE 
    WHEN scene_type IS NULL THEN '{}'::TEXT[]
    ELSE ARRAY[scene_type]
  END
WHERE scene_type IS NOT NULL;

-- Drop the old column (commented out for safety - uncomment after verifying data migration)
-- ALTER TABLE image_analysis DROP COLUMN IF EXISTS scene_type;

-- Add comment explaining the change
COMMENT ON COLUMN image_analysis.scene_types IS 'Array of scene types identified in the image (replaced single scene_type field)';
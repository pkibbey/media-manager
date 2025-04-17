-- Add performance indexes for common queries
-- Created: April 17, 2025

-- Add index on extension field since it's frequently used for filtering
CREATE INDEX IF NOT EXISTS "media_items_extension_idx" ON "public"."media_items" ("extension");

-- Add index on processed status since it's used in many queries
CREATE INDEX IF NOT EXISTS "media_items_processed_idx" ON "public"."media_items" ("processed");

-- Add index on has_exif field since it's frequently queried
CREATE INDEX IF NOT EXISTS "media_items_has_exif_idx" ON "public"."media_items" ("has_exif");

-- Add index on organized field since it's used in filtering
CREATE INDEX IF NOT EXISTS "media_items_organized_idx" ON "public"."media_items" ("organized");

-- Add index on thumbnail_path field which is used in thumbnail-related queries
CREATE INDEX IF NOT EXISTS "media_items_thumbnail_path_idx" ON "public"."media_items" ("thumbnail_path");

-- Add index on media_date since it's used for sorting and date range filtering
CREATE INDEX IF NOT EXISTS "media_items_media_date_idx" ON "public"."media_items" ("media_date");

-- Add compound indexes for common query patterns

-- This compound index will speed up EXIF processing queries that frequently filter by both extension and processed status
CREATE INDEX IF NOT EXISTS "media_items_ext_processed_idx" ON "public"."media_items" ("extension", "processed");

-- This compound index will help thumbnail queries that filter by extension and thumbnail_path
CREATE INDEX IF NOT EXISTS "media_items_ext_thumbnail_idx" ON "public"."media_items" ("extension", "thumbnail_path");

-- Add performance indexes to media_items table for faster filtering and sorting

-- Index for extension-based filtering (used in many queries)
CREATE INDEX IF NOT EXISTS idx_media_items_extension ON media_items (extension);

-- Index for folder path searches (used in folder navigation)
CREATE INDEX IF NOT EXISTS idx_media_items_folder_path ON media_items (folder_path);

-- Combined index for processed state filtering (common in exif processing)
CREATE INDEX IF NOT EXISTS idx_media_items_processed_has_exif ON media_items (processed, has_exif);

-- Index for media date sorting (common in browse views)
CREATE INDEX IF NOT EXISTS idx_media_items_media_date ON media_items (media_date);

-- Index for file size filtering (used in size range filters)
CREATE INDEX IF NOT EXISTS idx_media_items_size_bytes ON media_items (size_bytes);

-- Combined index for common filtering patterns in browse
CREATE INDEX IF NOT EXISTS idx_media_browse_common ON media_items (processed, organized, extension);

-- Comment explaining the purpose of these indexes
COMMENT ON INDEX idx_media_browse_common IS 'Supports common filtering patterns in the media browser';
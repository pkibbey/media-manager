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
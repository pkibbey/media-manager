-- Migration: Add visual_hash column to media table
-- This column stores perceptual hashes (dHash) for duplicate detection

ALTER TABLE "public"."media" 
ADD COLUMN "visual_hash" text;

-- Create an index on visual_hash for efficient duplicate detection queries
CREATE INDEX "idx_media_visual_hash" ON "public"."media" USING "btree" ("visual_hash");

-- Add a comment to document the column
COMMENT ON COLUMN "public"."media"."visual_hash" IS 'Perceptual hash (dHash) for duplicate image detection. Generated from 16x16 grayscale fingerprint.';

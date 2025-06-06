-- Migration: Create initial schema for media manager
-- This creates all the core tables needed for the media manager application

-- Create media_types table
CREATE TABLE "public"."media_types" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "mime_type" text NOT NULL,
    "is_ignored" boolean NOT NULL DEFAULT false,
    "is_native" boolean NOT NULL DEFAULT false,
    PRIMARY KEY ("id"),
    UNIQUE ("mime_type")
);

-- Create media table
CREATE TABLE "public"."media" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "media_path" text NOT NULL,
    "media_type_id" uuid NOT NULL,
    "size_bytes" bigint NOT NULL,
    "is_deleted" boolean NOT NULL DEFAULT false,
    "is_hidden" boolean NOT NULL DEFAULT false,
    "thumbnail_process" text,
    "thumbnail_url" text,
    "visual_hash" text,
    "blurry_photo_process" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    PRIMARY KEY ("id"),
    UNIQUE ("media_path"),
    FOREIGN KEY ("media_type_id") REFERENCES "public"."media_types"("id")
);

-- Create exif_data table
CREATE TABLE "public"."exif_data" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "media_id" uuid NOT NULL,
    "exif_timestamp" timestamp with time zone,
    "gps_latitude" double precision,
    "gps_longitude" double precision,
    "camera_make" text,
    "camera_model" text,
    "lens_model" text,
    "focal_length" double precision,
    "aperture" double precision,
    "iso" integer,
    "shutter_speed" text,
    "orientation" integer,
    "width" integer,
    "height" integer,
    "flash" text,
    "white_balance" text,
    "exposure_mode" text,
    "metering_mode" text,
    "scene_capture_type" text,
    "subject_distance" double precision,
    "light_source" text,
    "color_space" text,
    "exposure_bias" double precision,
    "exposure_program" text,
    "exif_process" text,
    "fix_date_process" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE,
    UNIQUE ("media_id")
);

-- Create analysis_data table
CREATE TABLE "public"."analysis_data" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "media_id" uuid NOT NULL,
    "analysis_type" text NOT NULL,
    "confidence_score" double precision,
    "tags" jsonb,
    "objects" jsonb,
    "faces" jsonb,
    "text" text,
    "adult_content" boolean,
    "violence" boolean,
    "racy_content" boolean,
    "medical_content" boolean,
    "spoofed" boolean,
    "analysis_process" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE,
    UNIQUE ("media_id", "analysis_type")
);

-- Create duplicates table
CREATE TABLE "public"."duplicates" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "media_id" uuid NOT NULL,
    "duplicate_id" uuid NOT NULL,
    "similarity_score" double precision,
    "hamming_distance" integer,
    "created_at" timestamp with time zone DEFAULT now(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE,
    FOREIGN KEY ("duplicate_id") REFERENCES "public"."media"("id") ON DELETE CASCADE,
    UNIQUE ("media_id", "duplicate_id")
);

-- Create indexes for better performance
CREATE INDEX "idx_media_media_path" ON "public"."media" USING "btree" ("media_path");
CREATE INDEX "idx_media_media_type_id" ON "public"."media" USING "btree" ("media_type_id");
CREATE INDEX "idx_media_is_deleted" ON "public"."media" USING "btree" ("is_deleted");
CREATE INDEX "idx_media_is_hidden" ON "public"."media" USING "btree" ("is_hidden");
CREATE INDEX "idx_media_thumbnail_process" ON "public"."media" USING "btree" ("thumbnail_process");
CREATE INDEX "idx_media_visual_hash" ON "public"."media" USING "btree" ("visual_hash");
CREATE INDEX "idx_media_blurry_photo_process" ON "public"."media" USING "btree" ("blurry_photo_process");

CREATE INDEX "idx_exif_data_media_id" ON "public"."exif_data" USING "btree" ("media_id");
CREATE INDEX "idx_exif_data_gps" ON "public"."exif_data" USING "btree" ("gps_latitude", "gps_longitude");
CREATE INDEX "idx_exif_data_timestamp" ON "public"."exif_data" USING "btree" ("exif_timestamp");

CREATE INDEX "idx_analysis_data_media_id" ON "public"."analysis_data" USING "btree" ("media_id");
CREATE INDEX "idx_analysis_data_type" ON "public"."analysis_data" USING "btree" ("analysis_type");

CREATE INDEX "idx_duplicates_media_id" ON "public"."duplicates" USING "btree" ("media_id");
CREATE INDEX "idx_duplicates_duplicate_id" ON "public"."duplicates" USING "btree" ("duplicate_id");
CREATE INDEX "idx_duplicates_similarity" ON "public"."duplicates" USING "btree" ("similarity_score");

-- Add comments to document the tables
COMMENT ON TABLE "public"."media_types" IS 'MIME types and their processing configuration';
COMMENT ON TABLE "public"."media" IS 'Main media files table with paths and metadata';
COMMENT ON TABLE "public"."exif_data" IS 'EXIF metadata extracted from media files';
COMMENT ON TABLE "public"."analysis_data" IS 'AI/ML analysis results for media files';
COMMENT ON TABLE "public"."duplicates" IS 'Detected duplicate relationships between media files';

COMMENT ON COLUMN "public"."media"."visual_hash" IS 'Perceptual hash (dHash) for duplicate image detection. Generated from 16x16 grayscale fingerprint.';
COMMENT ON COLUMN "public"."media"."blurry_photo_process" IS 'Processing status for blurry photo detection. Indicates whether the image has been analyzed for solid colors.';

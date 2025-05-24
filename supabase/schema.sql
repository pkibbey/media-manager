

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analysis_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "scene_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "objects" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL,
    "colors" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "faces" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL,
    "keywords" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "image_description" "text",
    "time_of_day" "text",
    "setting" "text",
    "content_warnings" "jsonb"[],
    "quality_assessment" "jsonb",
    "text_content" "text",
    "emotions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "artistic_elements" "jsonb",
    "people" "jsonb"[]
);


ALTER TABLE "public"."analysis_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exif_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "camera_make" "text",
    "camera_model" "text",
    "aperture" real,
    "exposure_time" "text",
    "iso" integer,
    "gps_latitude" double precision,
    "gps_longitude" double precision,
    "exif_timestamp" timestamp without time zone,
    "orientation" smallint,
    "metering_mode" "text",
    "light_source" "text",
    "digital_zoom_ratio" double precision,
    "focal_length_35mm" double precision,
    "scene_capture_type" "text",
    "subject_distance" double precision,
    "width" smallint DEFAULT '0'::smallint NOT NULL,
    "height" smallint NOT NULL,
    "field_of_view" "text",
    "depth_of_field" "text",
    "flash" "text",
    "lens_spec" "text",
    "lens_id" "text"
);


ALTER TABLE "public"."exif_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_type_id" "uuid" NOT NULL,
    "media_path" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "is_exif_processed" boolean DEFAULT false NOT NULL,
    "is_basic_processed" boolean DEFAULT false NOT NULL,
    "is_thumbnail_processed" boolean DEFAULT false NOT NULL,
    "is_advanced_processed" boolean DEFAULT false NOT NULL,
    "visual_hash" "text"
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "description" "text",
    "is_ignored" boolean DEFAULT false NOT NULL,
    "is_native" boolean DEFAULT false NOT NULL,
    "mime_type" "text" NOT NULL
);


ALTER TABLE "public"."media_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thumbnail_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "thumbnail_url" "text" NOT NULL
);


ALTER TABLE "public"."thumbnail_data" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analysis_data"
    ADD CONSTRAINT "analysis_results_file_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."analysis_data"
    ADD CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exif_data"
    ADD CONSTRAINT "exif_data_file_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."exif_data"
    ADD CONSTRAINT "exif_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_types"
    ADD CONSTRAINT "file_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_media_path_key" UNIQUE ("media_path");



ALTER TABLE ONLY "public"."media_types"
    ADD CONSTRAINT "media_types_mime_type_key" UNIQUE ("mime_type");



ALTER TABLE ONLY "public"."thumbnail_data"
    ADD CONSTRAINT "thumbnails_file_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."thumbnail_data"
    ADD CONSTRAINT "thumbnails_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_media_advanced_status" ON "public"."media" USING "btree" ("is_advanced_processed");



CREATE INDEX "idx_media_is_advanced_processed" ON "public"."media" USING "btree" ("is_advanced_processed");



CREATE INDEX "idx_media_is_basic_processed" ON "public"."media" USING "btree" ("is_basic_processed");



CREATE INDEX "idx_media_is_deleted" ON "public"."media" USING "btree" ("is_deleted");



CREATE INDEX "idx_media_is_exif_processed" ON "public"."media" USING "btree" ("is_exif_processed");



CREATE INDEX "idx_media_is_hidden" ON "public"."media" USING "btree" ("is_hidden");



CREATE INDEX "idx_media_is_thumbnail_processed" ON "public"."media" USING "btree" ("is_thumbnail_processed");



CREATE INDEX "idx_media_media_path" ON "public"."media" USING "btree" ("media_path");



CREATE INDEX "idx_media_media_type_id" ON "public"."media" USING "btree" ("media_type_id");



CREATE INDEX "idx_media_path" ON "public"."media" USING "btree" ("media_path");



CREATE INDEX "idx_media_processing_status" ON "public"."media" USING "btree" ("is_thumbnail_processed", "is_exif_processed", "is_basic_processed", "is_advanced_processed");



CREATE INDEX "idx_media_thumbnail_status" ON "public"."media" USING "btree" ("is_thumbnail_processed");



CREATE INDEX "idx_media_type_deleted_hidden" ON "public"."media" USING "btree" ("media_type_id", "is_deleted", "is_hidden");



CREATE INDEX "idx_media_type_mime_type" ON "public"."media_types" USING "btree" ("mime_type");



CREATE INDEX "idx_media_visual_hash" ON "public"."media" USING "btree" ("visual_hash");



ALTER TABLE ONLY "public"."analysis_data"
    ADD CONSTRAINT "analysis_results_file_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id");



ALTER TABLE ONLY "public"."exif_data"
    ADD CONSTRAINT "exif_data_file_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "files_file_type_id_fkey" FOREIGN KEY ("media_type_id") REFERENCES "public"."media_types"("id");



ALTER TABLE ONLY "public"."thumbnail_data"
    ADD CONSTRAINT "thumbnails_file_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."analysis_data" TO "anon";
GRANT ALL ON TABLE "public"."analysis_data" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_data" TO "service_role";



GRANT ALL ON TABLE "public"."exif_data" TO "anon";
GRANT ALL ON TABLE "public"."exif_data" TO "authenticated";
GRANT ALL ON TABLE "public"."exif_data" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON TABLE "public"."media_types" TO "anon";
GRANT ALL ON TABLE "public"."media_types" TO "authenticated";
GRANT ALL ON TABLE "public"."media_types" TO "service_role";



GRANT ALL ON TABLE "public"."thumbnail_data" TO "anon";
GRANT ALL ON TABLE "public"."thumbnail_data" TO "authenticated";
GRANT ALL ON TABLE "public"."thumbnail_data" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;



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
    "id" "uuid" NOT NULL,
    "media_id" "uuid" NOT NULL,
    "scene_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "objects" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL,
    "colors" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "faces" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL,
    "keywords" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "image_description" "text",
    "created_date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "time_of_day" "text",
    "setting" "text",
    "content_warnings" "jsonb"[] NOT NULL,
    "quality_assessment" "jsonb",
    "artistic_elements" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL,
    "text_content" "text",
    "people" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "emotions" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."analysis_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" character varying(50) DEFAULT 'settings'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "thumbnails" "jsonb" DEFAULT '{"format": "webp", "quality": 80, "maxWidth": 1200, "maxHeight": 1200, "generateWebP": true}'::"jsonb",
    "analysis" "jsonb" DEFAULT '{"batchSize": 10, "modelName": "minicpm-v:latest", "autoProcessNew": true, "minConfidenceScore": 0.7}'::"jsonb",
    "exif" "jsonb" DEFAULT '{"batchSize": 20, "autoProcessNew": true, "prioritizeGpsData": true}'::"jsonb",
    "storage" "jsonb" DEFAULT '{"mediaPath": "/media", "maxStorageGB": 100, "thumbnailPath": "/thumbnails", "cleanupThresholdPercent": 90}'::"jsonb",
    "system" "jsonb" DEFAULT '{"logLevel": "info", "adminEmail": "", "maxConcurrentJobs": 3, "notificationsEnabled": true}'::"jsonb"
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exif_data" (
    "id" "uuid" NOT NULL,
    "created_date" timestamp without time zone DEFAULT "now"() NOT NULL,
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
    "id" "uuid" NOT NULL,
    "media_type_id" "uuid" NOT NULL,
    "created_date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "media_path" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "is_exif_processed" boolean DEFAULT false NOT NULL,
    "is_basic_processed" boolean DEFAULT false NOT NULL,
    "is_thumbnail_processed" boolean DEFAULT false NOT NULL,
    "is_advanced_processed" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_types" (
    "id" "uuid" NOT NULL,
    "created_date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "type_name" "text" NOT NULL,
    "type_description" "text",
    "is_ignored" boolean DEFAULT false NOT NULL,
    "is_native" boolean DEFAULT false NOT NULL,
    "mime_type" "text"
);


ALTER TABLE "public"."media_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thumbnail_data" (
    "id" "uuid" NOT NULL,
    "created_date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "thumbnail_url" "text" NOT NULL
);


ALTER TABLE "public"."thumbnail_data" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analysis_data"
    ADD CONSTRAINT "analysis_results_file_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."analysis_data"
    ADD CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exif_data"
    ADD CONSTRAINT "exif_data_file_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."exif_data"
    ADD CONSTRAINT "exif_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_types"
    ADD CONSTRAINT "file_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_types"
    ADD CONSTRAINT "file_types_type_name_key" UNIQUE ("type_name");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_media_path_key" UNIQUE ("media_path");



ALTER TABLE ONLY "public"."thumbnail_data"
    ADD CONSTRAINT "thumbnails_file_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."thumbnail_data"
    ADD CONSTRAINT "thumbnails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "unique_settings_record" UNIQUE ("key");



CREATE OR REPLACE TRIGGER "update_app_settings_updated_at" BEFORE UPDATE ON "public"."app_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



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



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



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

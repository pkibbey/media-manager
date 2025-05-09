

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





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analysis_results" (
    "id" "uuid" NOT NULL,
    "scene_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "objects" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL,
    "colors" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "faces" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "image_description" "text",
    "sentiment" real DEFAULT '0'::real NOT NULL,
    "quality_score" real DEFAULT '0'::real NOT NULL,
    "safety_level" real DEFAULT '1'::real NOT NULL,
    "created_date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "media_id" "uuid" NOT NULL
);


ALTER TABLE "public"."analysis_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exif_data" (
    "id" "uuid" NOT NULL,
    "created_date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "camera_make" "text",
    "camera_model" "text",
    "aperture" double precision,
    "exposure_time" double precision,
    "iso" integer,
    "gps_latitude" double precision,
    "gps_longitude" double precision,
    "exif_timestamp" timestamp without time zone,
    "orientation" "text",
    "metering_mode" "text",
    "light_source" "text",
    "digital_zoom_ratio" double precision,
    "focal_length_35mm" double precision,
    "scene_capture_type" "text",
    "subject_distance" double precision,
    "offset_time" "text",
    "media_id" "uuid" NOT NULL,
    "height" smallint NOT NULL,
    "width" smallint DEFAULT '0'::smallint NOT NULL
);


ALTER TABLE "public"."exif_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" NOT NULL,
    "created_date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "size_bytes" bigint NOT NULL,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "media_path" "text" NOT NULL,
    "media_type_id" "uuid" NOT NULL
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


CREATE TABLE IF NOT EXISTS "public"."thumbnails" (
    "id" "uuid" NOT NULL,
    "created_date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "thumbnail_url" "text" NOT NULL,
    "media_id" "uuid" NOT NULL
);


ALTER TABLE "public"."thumbnails" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analysis_results"
    ADD CONSTRAINT "analysis_results_file_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."analysis_results"
    ADD CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."thumbnails"
    ADD CONSTRAINT "thumbnails_file_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."thumbnails"
    ADD CONSTRAINT "thumbnails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_results"
    ADD CONSTRAINT "analysis_results_file_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id");



ALTER TABLE ONLY "public"."exif_data"
    ADD CONSTRAINT "exif_data_file_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "files_file_type_id_fkey" FOREIGN KEY ("media_type_id") REFERENCES "public"."media_types"("id");



ALTER TABLE ONLY "public"."thumbnails"
    ADD CONSTRAINT "thumbnails_file_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
































































































































































































GRANT ALL ON TABLE "public"."analysis_results" TO "anon";
GRANT ALL ON TABLE "public"."analysis_results" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_results" TO "service_role";



GRANT ALL ON TABLE "public"."exif_data" TO "anon";
GRANT ALL ON TABLE "public"."exif_data" TO "authenticated";
GRANT ALL ON TABLE "public"."exif_data" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON TABLE "public"."media_types" TO "anon";
GRANT ALL ON TABLE "public"."media_types" TO "authenticated";
GRANT ALL ON TABLE "public"."media_types" TO "service_role";



GRANT ALL ON TABLE "public"."thumbnails" TO "anon";
GRANT ALL ON TABLE "public"."thumbnails" TO "authenticated";
GRANT ALL ON TABLE "public"."thumbnails" TO "service_role";









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

--
-- Dumped schema changes for auth and storage
--


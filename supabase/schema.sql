

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


CREATE TABLE IF NOT EXISTS "public"."analysis_data" (
    "id" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "media_id" "text" NOT NULL,
    "analysis_process" "text",
    "image_description" "text",
    "tags" "jsonb",
    "keywords" "text"[],
    "objects" "jsonb",
    "faces" "jsonb",
    "text" "text",
    "confidence_score" real,
    "adult_content" boolean,
    "racy_content" boolean,
    "medical_content" boolean,
    "violence" boolean,
    "spoofed" boolean,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."analysis_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duplicates" (
    "id" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "media_id" "text" NOT NULL,
    "duplicate_id" "text" NOT NULL,
    "similarity_score" real,
    "hamming_distance" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."duplicates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exif_data" (
    "id" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "media_id" "text" NOT NULL,
    "exif_timestamp" timestamp with time zone,
    "camera_make" "text",
    "camera_model" "text",
    "lens_id" "text",
    "lens_model" "text",
    "aperture" real,
    "exposure_time" "text",
    "shutter_speed" "text",
    "iso" integer,
    "focal_length_35mm" integer,
    "gps_latitude" real,
    "gps_longitude" real,
    "orientation" integer,
    "width" integer,
    "height" integer,
    "color_space" "text",
    "exposure_bias" real,
    "exposure_mode" "text",
    "exposure_program" "text",
    "field_of_view" "text",
    "depth_of_field" "text",
    "digital_zoom_ratio" "text",
    "flash" "text",
    "light_source" "text",
    "metering_mode" "text",
    "scene_capture_type" "text",
    "subject_distance" real,
    "white_balance" "text",
    "exif_process" "text",
    "fix_date_process" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."exif_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "media_path" "text" NOT NULL,
    "media_type_id" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "visual_hash" "text",
    "thumbnail_url" "text",
    "thumbnail_process" "text",
    "blurry_photo_process" "text",
    "is_hidden" boolean DEFAULT false NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_types" (
    "id" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "mime_type" "text" NOT NULL,
    "is_native" boolean DEFAULT false,
    "is_ignored" boolean DEFAULT false
);


ALTER TABLE "public"."media_types" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analysis_data"
    ADD CONSTRAINT "analysis_data_media_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."analysis_data"
    ADD CONSTRAINT "analysis_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duplicates"
    ADD CONSTRAINT "duplicates_media_id_duplicate_id_key" UNIQUE ("media_id", "duplicate_id");



ALTER TABLE ONLY "public"."duplicates"
    ADD CONSTRAINT "duplicates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exif_data"
    ADD CONSTRAINT "exif_data_media_id_key" UNIQUE ("media_id");



ALTER TABLE ONLY "public"."exif_data"
    ADD CONSTRAINT "exif_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_media_path_key" UNIQUE ("media_path");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_types"
    ADD CONSTRAINT "media_types_mime_type_key" UNIQUE ("mime_type");



ALTER TABLE ONLY "public"."media_types"
    ADD CONSTRAINT "media_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_visual_hash_key" UNIQUE ("visual_hash");



CREATE INDEX "idx_analysis_data_media_id" ON "public"."analysis_data" USING "btree" ("media_id");



CREATE INDEX "idx_duplicates_duplicate_id" ON "public"."duplicates" USING "btree" ("duplicate_id");



CREATE INDEX "idx_duplicates_media_id" ON "public"."duplicates" USING "btree" ("media_id");



CREATE INDEX "idx_exif_data_media_id" ON "public"."exif_data" USING "btree" ("media_id");



CREATE INDEX "idx_media_media_type_id" ON "public"."media" USING "btree" ("media_type_id");



CREATE INDEX "idx_media_visual_hash" ON "public"."media" USING "btree" ("visual_hash");



ALTER TABLE ONLY "public"."analysis_data"
    ADD CONSTRAINT "analysis_data_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duplicates"
    ADD CONSTRAINT "duplicates_duplicate_id_fkey" FOREIGN KEY ("duplicate_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duplicates"
    ADD CONSTRAINT "duplicates_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exif_data"
    ADD CONSTRAINT "exif_data_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_media_type_id_fkey" FOREIGN KEY ("media_type_id") REFERENCES "public"."media_types"("id");



CREATE POLICY "Allow public access to analysis_data" ON "public"."analysis_data" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public access to duplicates" ON "public"."duplicates" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public access to exif_data" ON "public"."exif_data" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public access to media" ON "public"."media" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read access on media_types" ON "public"."media_types" FOR SELECT USING (true);



ALTER TABLE "public"."analysis_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."duplicates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exif_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_types" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
































































































































































































GRANT ALL ON TABLE "public"."analysis_data" TO "anon";
GRANT ALL ON TABLE "public"."analysis_data" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_data" TO "service_role";



GRANT ALL ON TABLE "public"."duplicates" TO "anon";
GRANT ALL ON TABLE "public"."duplicates" TO "authenticated";
GRANT ALL ON TABLE "public"."duplicates" TO "service_role";



GRANT ALL ON TABLE "public"."exif_data" TO "anon";
GRANT ALL ON TABLE "public"."exif_data" TO "authenticated";
GRANT ALL ON TABLE "public"."exif_data" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON TABLE "public"."media_types" TO "anon";
GRANT ALL ON TABLE "public"."media_types" TO "authenticated";
GRANT ALL ON TABLE "public"."media_types" TO "service_role";









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

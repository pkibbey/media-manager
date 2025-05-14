create table "public"."analysis_data" (
    "id" uuid not null,
    "media_id" uuid not null,
    "scene_types" text[] not null default '{}'::text[],
    "objects" jsonb[] not null default '{}'::jsonb[],
    "colors" text[] not null default '{}'::text[],
    "faces" jsonb[] not null default '{}'::jsonb[],
    "keywords" text[] not null default '{}'::text[],
    "image_description" text,
    "created_date" timestamp without time zone not null default now(),
    "time_of_day" text,
    "setting" text,
    "content_warnings" jsonb[] not null,
    "quality_assessment" jsonb,
    "artistic_elements" jsonb[] not null default '{}'::jsonb[],
    "text_content" text,
    "people" text[] not null default '{}'::text[],
    "emotions" text[] not null default '{}'::text[]
);


create table "public"."app_settings" (
    "id" uuid not null default gen_random_uuid(),
    "key" character varying(50) not null default 'settings'::character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "thumbnails" jsonb default '{"format": "webp", "quality": 80, "maxWidth": 1200, "maxHeight": 1200, "generateWebP": true}'::jsonb,
    "analysis" jsonb default '{"batchSize": 10, "modelName": "minicpm-v:latest", "autoProcessNew": true, "minConfidenceScore": 0.7}'::jsonb,
    "exif" jsonb default '{"batchSize": 20, "autoProcessNew": true, "prioritizeGpsData": true}'::jsonb,
    "storage" jsonb default '{"mediaPath": "/media", "maxStorageGB": 100, "thumbnailPath": "/thumbnails", "cleanupThresholdPercent": 90}'::jsonb,
    "system" jsonb default '{"logLevel": "info", "adminEmail": "", "maxConcurrentJobs": 3, "notificationsEnabled": true}'::jsonb
);


create table "public"."exif_data" (
    "id" uuid not null,
    "created_date" timestamp without time zone not null default now(),
    "media_id" uuid not null,
    "camera_make" text,
    "camera_model" text,
    "aperture" real,
    "exposure_time" text,
    "iso" integer,
    "gps_latitude" double precision,
    "gps_longitude" double precision,
    "exif_timestamp" timestamp without time zone,
    "orientation" smallint,
    "metering_mode" text,
    "light_source" text,
    "digital_zoom_ratio" double precision,
    "focal_length_35mm" double precision,
    "scene_capture_type" text,
    "subject_distance" double precision,
    "width" smallint not null default '0'::smallint,
    "height" smallint not null,
    "field_of_view" text,
    "depth_of_field" text,
    "flash" text,
    "lens_spec" text,
    "lens_id" text
);


create table "public"."media" (
    "id" uuid not null,
    "media_type_id" uuid not null,
    "created_date" timestamp without time zone not null default now(),
    "media_path" text not null,
    "size_bytes" bigint not null,
    "is_hidden" boolean not null default false,
    "is_deleted" boolean not null default false,
    "is_exif_processed" boolean not null default false,
    "is_basic_processed" boolean not null default false,
    "is_thumbnail_processed" boolean not null default false,
    "is_advanced_processed" boolean not null default false
);


create table "public"."media_types" (
    "id" uuid not null,
    "created_date" timestamp without time zone not null default now(),
    "type_name" text not null,
    "type_description" text,
    "is_ignored" boolean not null default false,
    "is_native" boolean not null default false,
    "mime_type" text
);


create table "public"."thumbnail_data" (
    "id" uuid not null,
    "created_date" timestamp without time zone not null default now(),
    "media_id" uuid not null,
    "thumbnail_url" text not null
);


CREATE UNIQUE INDEX analysis_results_file_id_key ON public.analysis_data USING btree (media_id);

CREATE UNIQUE INDEX analysis_results_pkey ON public.analysis_data USING btree (id);

CREATE UNIQUE INDEX app_settings_pkey ON public.app_settings USING btree (id);

CREATE UNIQUE INDEX exif_data_file_id_key ON public.exif_data USING btree (media_id);

CREATE UNIQUE INDEX exif_data_pkey ON public.exif_data USING btree (id);

CREATE UNIQUE INDEX file_types_pkey ON public.media_types USING btree (id);

CREATE UNIQUE INDEX file_types_type_name_key ON public.media_types USING btree (type_name);

CREATE UNIQUE INDEX files_pkey ON public.media USING btree (id);

CREATE UNIQUE INDEX media_media_path_key ON public.media USING btree (media_path);

CREATE UNIQUE INDEX thumbnails_file_id_key ON public.thumbnail_data USING btree (media_id);

CREATE UNIQUE INDEX thumbnails_pkey ON public.thumbnail_data USING btree (id);

CREATE UNIQUE INDEX unique_settings_record ON public.app_settings USING btree (key);

alter table "public"."analysis_data" add constraint "analysis_results_pkey" PRIMARY KEY using index "analysis_results_pkey";

alter table "public"."app_settings" add constraint "app_settings_pkey" PRIMARY KEY using index "app_settings_pkey";

alter table "public"."exif_data" add constraint "exif_data_pkey" PRIMARY KEY using index "exif_data_pkey";

alter table "public"."media" add constraint "files_pkey" PRIMARY KEY using index "files_pkey";

alter table "public"."media_types" add constraint "file_types_pkey" PRIMARY KEY using index "file_types_pkey";

alter table "public"."thumbnail_data" add constraint "thumbnails_pkey" PRIMARY KEY using index "thumbnails_pkey";

alter table "public"."analysis_data" add constraint "analysis_results_file_id_fkey" FOREIGN KEY (media_id) REFERENCES media(id) not valid;

alter table "public"."analysis_data" validate constraint "analysis_results_file_id_fkey";

alter table "public"."analysis_data" add constraint "analysis_results_file_id_key" UNIQUE using index "analysis_results_file_id_key";

alter table "public"."app_settings" add constraint "unique_settings_record" UNIQUE using index "unique_settings_record";

alter table "public"."exif_data" add constraint "exif_data_file_id_fkey" FOREIGN KEY (media_id) REFERENCES media(id) not valid;

alter table "public"."exif_data" validate constraint "exif_data_file_id_fkey";

alter table "public"."exif_data" add constraint "exif_data_file_id_key" UNIQUE using index "exif_data_file_id_key";

alter table "public"."media" add constraint "files_file_type_id_fkey" FOREIGN KEY (media_type_id) REFERENCES media_types(id) not valid;

alter table "public"."media" validate constraint "files_file_type_id_fkey";

alter table "public"."media" add constraint "media_media_path_key" UNIQUE using index "media_media_path_key";

alter table "public"."media_types" add constraint "file_types_type_name_key" UNIQUE using index "file_types_type_name_key";

alter table "public"."thumbnail_data" add constraint "thumbnails_file_id_fkey" FOREIGN KEY (media_id) REFERENCES media(id) not valid;

alter table "public"."thumbnail_data" validate constraint "thumbnails_file_id_fkey";

alter table "public"."thumbnail_data" add constraint "thumbnails_file_id_key" UNIQUE using index "thumbnails_file_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
;

grant delete on table "public"."analysis_data" to "anon";

grant insert on table "public"."analysis_data" to "anon";

grant references on table "public"."analysis_data" to "anon";

grant select on table "public"."analysis_data" to "anon";

grant trigger on table "public"."analysis_data" to "anon";

grant truncate on table "public"."analysis_data" to "anon";

grant update on table "public"."analysis_data" to "anon";

grant delete on table "public"."analysis_data" to "authenticated";

grant insert on table "public"."analysis_data" to "authenticated";

grant references on table "public"."analysis_data" to "authenticated";

grant select on table "public"."analysis_data" to "authenticated";

grant trigger on table "public"."analysis_data" to "authenticated";

grant truncate on table "public"."analysis_data" to "authenticated";

grant update on table "public"."analysis_data" to "authenticated";

grant delete on table "public"."analysis_data" to "service_role";

grant insert on table "public"."analysis_data" to "service_role";

grant references on table "public"."analysis_data" to "service_role";

grant select on table "public"."analysis_data" to "service_role";

grant trigger on table "public"."analysis_data" to "service_role";

grant truncate on table "public"."analysis_data" to "service_role";

grant update on table "public"."analysis_data" to "service_role";

grant delete on table "public"."app_settings" to "anon";

grant insert on table "public"."app_settings" to "anon";

grant references on table "public"."app_settings" to "anon";

grant select on table "public"."app_settings" to "anon";

grant trigger on table "public"."app_settings" to "anon";

grant truncate on table "public"."app_settings" to "anon";

grant update on table "public"."app_settings" to "anon";

grant delete on table "public"."app_settings" to "authenticated";

grant insert on table "public"."app_settings" to "authenticated";

grant references on table "public"."app_settings" to "authenticated";

grant select on table "public"."app_settings" to "authenticated";

grant trigger on table "public"."app_settings" to "authenticated";

grant truncate on table "public"."app_settings" to "authenticated";

grant update on table "public"."app_settings" to "authenticated";

grant delete on table "public"."app_settings" to "service_role";

grant insert on table "public"."app_settings" to "service_role";

grant references on table "public"."app_settings" to "service_role";

grant select on table "public"."app_settings" to "service_role";

grant trigger on table "public"."app_settings" to "service_role";

grant truncate on table "public"."app_settings" to "service_role";

grant update on table "public"."app_settings" to "service_role";

grant delete on table "public"."exif_data" to "anon";

grant insert on table "public"."exif_data" to "anon";

grant references on table "public"."exif_data" to "anon";

grant select on table "public"."exif_data" to "anon";

grant trigger on table "public"."exif_data" to "anon";

grant truncate on table "public"."exif_data" to "anon";

grant update on table "public"."exif_data" to "anon";

grant delete on table "public"."exif_data" to "authenticated";

grant insert on table "public"."exif_data" to "authenticated";

grant references on table "public"."exif_data" to "authenticated";

grant select on table "public"."exif_data" to "authenticated";

grant trigger on table "public"."exif_data" to "authenticated";

grant truncate on table "public"."exif_data" to "authenticated";

grant update on table "public"."exif_data" to "authenticated";

grant delete on table "public"."exif_data" to "service_role";

grant insert on table "public"."exif_data" to "service_role";

grant references on table "public"."exif_data" to "service_role";

grant select on table "public"."exif_data" to "service_role";

grant trigger on table "public"."exif_data" to "service_role";

grant truncate on table "public"."exif_data" to "service_role";

grant update on table "public"."exif_data" to "service_role";

grant delete on table "public"."media" to "anon";

grant insert on table "public"."media" to "anon";

grant references on table "public"."media" to "anon";

grant select on table "public"."media" to "anon";

grant trigger on table "public"."media" to "anon";

grant truncate on table "public"."media" to "anon";

grant update on table "public"."media" to "anon";

grant delete on table "public"."media" to "authenticated";

grant insert on table "public"."media" to "authenticated";

grant references on table "public"."media" to "authenticated";

grant select on table "public"."media" to "authenticated";

grant trigger on table "public"."media" to "authenticated";

grant truncate on table "public"."media" to "authenticated";

grant update on table "public"."media" to "authenticated";

grant delete on table "public"."media" to "service_role";

grant insert on table "public"."media" to "service_role";

grant references on table "public"."media" to "service_role";

grant select on table "public"."media" to "service_role";

grant trigger on table "public"."media" to "service_role";

grant truncate on table "public"."media" to "service_role";

grant update on table "public"."media" to "service_role";

grant delete on table "public"."media_types" to "anon";

grant insert on table "public"."media_types" to "anon";

grant references on table "public"."media_types" to "anon";

grant select on table "public"."media_types" to "anon";

grant trigger on table "public"."media_types" to "anon";

grant truncate on table "public"."media_types" to "anon";

grant update on table "public"."media_types" to "anon";

grant delete on table "public"."media_types" to "authenticated";

grant insert on table "public"."media_types" to "authenticated";

grant references on table "public"."media_types" to "authenticated";

grant select on table "public"."media_types" to "authenticated";

grant trigger on table "public"."media_types" to "authenticated";

grant truncate on table "public"."media_types" to "authenticated";

grant update on table "public"."media_types" to "authenticated";

grant delete on table "public"."media_types" to "service_role";

grant insert on table "public"."media_types" to "service_role";

grant references on table "public"."media_types" to "service_role";

grant select on table "public"."media_types" to "service_role";

grant trigger on table "public"."media_types" to "service_role";

grant truncate on table "public"."media_types" to "service_role";

grant update on table "public"."media_types" to "service_role";

grant delete on table "public"."thumbnail_data" to "anon";

grant insert on table "public"."thumbnail_data" to "anon";

grant references on table "public"."thumbnail_data" to "anon";

grant select on table "public"."thumbnail_data" to "anon";

grant trigger on table "public"."thumbnail_data" to "anon";

grant truncate on table "public"."thumbnail_data" to "anon";

grant update on table "public"."thumbnail_data" to "anon";

grant delete on table "public"."thumbnail_data" to "authenticated";

grant insert on table "public"."thumbnail_data" to "authenticated";

grant references on table "public"."thumbnail_data" to "authenticated";

grant select on table "public"."thumbnail_data" to "authenticated";

grant trigger on table "public"."thumbnail_data" to "authenticated";

grant truncate on table "public"."thumbnail_data" to "authenticated";

grant update on table "public"."thumbnail_data" to "authenticated";

grant delete on table "public"."thumbnail_data" to "service_role";

grant insert on table "public"."thumbnail_data" to "service_role";

grant references on table "public"."thumbnail_data" to "service_role";

grant select on table "public"."thumbnail_data" to "service_role";

grant trigger on table "public"."thumbnail_data" to "service_role";

grant truncate on table "public"."thumbnail_data" to "service_role";

grant update on table "public"."thumbnail_data" to "service_role";

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



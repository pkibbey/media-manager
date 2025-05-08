revoke delete on table "public"."file_types" from "anon";

revoke insert on table "public"."file_types" from "anon";

revoke references on table "public"."file_types" from "anon";

revoke select on table "public"."file_types" from "anon";

revoke trigger on table "public"."file_types" from "anon";

revoke truncate on table "public"."file_types" from "anon";

revoke update on table "public"."file_types" from "anon";

revoke delete on table "public"."file_types" from "authenticated";

revoke insert on table "public"."file_types" from "authenticated";

revoke references on table "public"."file_types" from "authenticated";

revoke select on table "public"."file_types" from "authenticated";

revoke trigger on table "public"."file_types" from "authenticated";

revoke truncate on table "public"."file_types" from "authenticated";

revoke update on table "public"."file_types" from "authenticated";

revoke delete on table "public"."file_types" from "service_role";

revoke insert on table "public"."file_types" from "service_role";

revoke references on table "public"."file_types" from "service_role";

revoke select on table "public"."file_types" from "service_role";

revoke trigger on table "public"."file_types" from "service_role";

revoke truncate on table "public"."file_types" from "service_role";

revoke update on table "public"."file_types" from "service_role";

alter table "public"."file_types" drop constraint "file_types_type_name_key";

alter table "public"."analysis_results" drop constraint "analysis_results_file_id_fkey";

alter table "public"."analysis_results" drop constraint "analysis_results_file_id_key";

alter table "public"."media" drop constraint "files_file_type_id_fkey";

alter table "public"."thumbnails" drop constraint "thumbnails_file_id_fkey";

alter table "public"."thumbnails" drop constraint "thumbnails_file_id_key";

alter table "public"."file_types" drop constraint "file_types_pkey";

drop index if exists "public"."analysis_results_file_id_key";

drop index if exists "public"."file_types_pkey";

drop index if exists "public"."file_types_type_name_key";

drop index if exists "public"."thumbnails_file_id_key";

drop table "public"."file_types";

create table "public"."media_types" (
    "id" uuid not null,
    "created_date" timestamp without time zone not null default now(),
    "type_name" text not null,
    "type_description" text,
    "is_ignored" boolean not null default false,
    "is_native" boolean not null default false,
    "mime_type" text
);


alter table "public"."analysis_results" drop column "file_id";

alter table "public"."analysis_results" add column "media_id" uuid not null;

alter table "public"."media" drop column "file_path";

alter table "public"."media" drop column "file_type_id";

alter table "public"."media" add column "media_path" text not null;

alter table "public"."media" add column "media_type_id" uuid not null;

alter table "public"."thumbnails" drop column "file_id";

alter table "public"."thumbnails" add column "media_id" uuid not null;

CREATE UNIQUE INDEX analysis_results_file_id_key ON public.analysis_results USING btree (media_id);

CREATE UNIQUE INDEX file_types_pkey ON public.media_types USING btree (id);

CREATE UNIQUE INDEX file_types_type_name_key ON public.media_types USING btree (type_name);

CREATE UNIQUE INDEX thumbnails_file_id_key ON public.thumbnails USING btree (media_id);

alter table "public"."media_types" add constraint "file_types_pkey" PRIMARY KEY using index "file_types_pkey";

alter table "public"."media_types" add constraint "file_types_type_name_key" UNIQUE using index "file_types_type_name_key";

alter table "public"."analysis_results" add constraint "analysis_results_file_id_fkey" FOREIGN KEY (media_id) REFERENCES media(id) not valid;

alter table "public"."analysis_results" validate constraint "analysis_results_file_id_fkey";

alter table "public"."analysis_results" add constraint "analysis_results_file_id_key" UNIQUE using index "analysis_results_file_id_key";

alter table "public"."media" add constraint "files_file_type_id_fkey" FOREIGN KEY (media_type_id) REFERENCES media_types(id) not valid;

alter table "public"."media" validate constraint "files_file_type_id_fkey";

alter table "public"."thumbnails" add constraint "thumbnails_file_id_fkey" FOREIGN KEY (media_id) REFERENCES media(id) not valid;

alter table "public"."thumbnails" validate constraint "thumbnails_file_id_fkey";

alter table "public"."thumbnails" add constraint "thumbnails_file_id_key" UNIQUE using index "thumbnails_file_id_key";

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



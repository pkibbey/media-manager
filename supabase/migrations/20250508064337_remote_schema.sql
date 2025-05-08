revoke delete on table "public"."files" from "anon";

revoke insert on table "public"."files" from "anon";

revoke references on table "public"."files" from "anon";

revoke select on table "public"."files" from "anon";

revoke trigger on table "public"."files" from "anon";

revoke truncate on table "public"."files" from "anon";

revoke update on table "public"."files" from "anon";

revoke delete on table "public"."files" from "authenticated";

revoke insert on table "public"."files" from "authenticated";

revoke references on table "public"."files" from "authenticated";

revoke select on table "public"."files" from "authenticated";

revoke trigger on table "public"."files" from "authenticated";

revoke truncate on table "public"."files" from "authenticated";

revoke update on table "public"."files" from "authenticated";

revoke delete on table "public"."files" from "service_role";

revoke insert on table "public"."files" from "service_role";

revoke references on table "public"."files" from "service_role";

revoke select on table "public"."files" from "service_role";

revoke trigger on table "public"."files" from "service_role";

revoke truncate on table "public"."files" from "service_role";

revoke update on table "public"."files" from "service_role";

alter table "public"."files" drop constraint "files_file_type_id_fkey";

alter table "public"."analysis_results" drop constraint "analysis_results_file_id_fkey";

alter table "public"."exif_data" drop constraint "exif_data_file_id_fkey";

alter table "public"."thumbnails" drop constraint "thumbnails_file_id_fkey";

alter table "public"."files" drop constraint "files_pkey";

drop index if exists "public"."files_pkey";

drop table "public"."files";

create table "public"."media" (
    "id" uuid not null,
    "file_type_id" uuid not null,
    "created_date" timestamp without time zone not null default now(),
    "file_path" text not null,
    "size_bytes" bigint not null,
    "is_hidden" boolean not null default false,
    "is_deleted" boolean not null default false
);


CREATE UNIQUE INDEX files_pkey ON public.media USING btree (id);

alter table "public"."media" add constraint "files_pkey" PRIMARY KEY using index "files_pkey";

alter table "public"."media" add constraint "files_file_type_id_fkey" FOREIGN KEY (file_type_id) REFERENCES file_types(id) not valid;

alter table "public"."media" validate constraint "files_file_type_id_fkey";

alter table "public"."analysis_results" add constraint "analysis_results_file_id_fkey" FOREIGN KEY (file_id) REFERENCES media(id) not valid;

alter table "public"."analysis_results" validate constraint "analysis_results_file_id_fkey";

alter table "public"."exif_data" add constraint "exif_data_file_id_fkey" FOREIGN KEY (file_id) REFERENCES media(id) not valid;

alter table "public"."exif_data" validate constraint "exif_data_file_id_fkey";

alter table "public"."thumbnails" add constraint "thumbnails_file_id_fkey" FOREIGN KEY (file_id) REFERENCES media(id) not valid;

alter table "public"."thumbnails" validate constraint "thumbnails_file_id_fkey";

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



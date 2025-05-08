alter table "public"."exif_data" drop constraint "exif_data_file_id_fkey";

alter table "public"."exif_data" drop constraint "exif_data_file_id_key";

drop index if exists "public"."exif_data_file_id_key";

alter table "public"."exif_data" drop column "file_id";

alter table "public"."exif_data" add column "media_id" uuid not null;

CREATE UNIQUE INDEX exif_data_file_id_key ON public.exif_data USING btree (media_id);

alter table "public"."exif_data" add constraint "exif_data_file_id_fkey" FOREIGN KEY (media_id) REFERENCES media(id) not valid;

alter table "public"."exif_data" validate constraint "exif_data_file_id_fkey";

alter table "public"."exif_data" add constraint "exif_data_file_id_key" UNIQUE using index "exif_data_file_id_key";



alter table "public"."exif_data" add column "height" smallint not null;

alter table "public"."exif_data" add column "width" smallint not null default '0'::smallint;



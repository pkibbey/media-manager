CREATE UNIQUE INDEX analysis_results_file_id_key ON public.analysis_results USING btree (file_id);

CREATE UNIQUE INDEX exif_data_file_id_key ON public.exif_data USING btree (file_id);

CREATE UNIQUE INDEX thumbnails_file_id_key ON public.thumbnails USING btree (file_id);

alter table "public"."analysis_results" add constraint "analysis_results_file_id_key" UNIQUE using index "analysis_results_file_id_key";

alter table "public"."exif_data" add constraint "exif_data_file_id_key" UNIQUE using index "exif_data_file_id_key";

alter table "public"."thumbnails" add constraint "thumbnails_file_id_key" UNIQUE using index "thumbnails_file_id_key";



CREATE INDEX idx_media_advanced_status ON public.media USING btree (is_advanced_processed);

CREATE INDEX idx_media_media_path ON public.media USING btree (media_path);

CREATE INDEX idx_media_thumbnail_status ON public.media USING btree (is_thumbnail_processed);



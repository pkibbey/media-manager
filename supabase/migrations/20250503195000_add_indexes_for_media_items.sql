-- Add indexes to optimize the get_media_items function
-- These indexes cover the fields used in filtering, sorting, and joins

-- Index for the foreign key relationship that's used in the join
CREATE INDEX IF NOT EXISTS idx_media_items_file_type_id ON public.media_items(file_type_id);

-- Index for the camera filter
CREATE INDEX IF NOT EXISTS idx_media_items_camera ON public.media_items(camera);

-- Index for the created_date field used in date range filters and sorting
CREATE INDEX IF NOT EXISTS idx_media_items_created_date ON public.media_items(created_date);

-- Index for the size_bytes field used in size range filters and sorting
CREATE INDEX IF NOT EXISTS idx_media_items_size_bytes ON public.media_items(size_bytes);

-- Index for the file_name field used in search filters and sorting
CREATE INDEX IF NOT EXISTS idx_media_items_file_name ON public.media_items(file_name);

-- Index for the thumbnail_path field to optimize thumbnail filter
CREATE INDEX IF NOT EXISTS idx_media_items_thumbnail_path ON public.media_items(thumbnail_path) 
WHERE thumbnail_path IS NOT NULL;

-- B-tree index for file_types.category to speed up file type filtering
CREATE INDEX IF NOT EXISTS idx_file_types_category ON public.file_types(category);

-- Index for the ignore flag on file_types table
CREATE INDEX IF NOT EXISTS idx_file_types_ignore ON public.file_types(ignore);

-- GIN index for the exif_data JSONB field to optimize exif and location filters
CREATE INDEX IF NOT EXISTS idx_media_items_exif_data_gin ON public.media_items USING GIN (exif_data);

-- Partial index for files with GPS data
CREATE INDEX IF NOT EXISTS idx_media_items_with_gps ON public.media_items ((exif_data->>'GPSLatitude'))
WHERE exif_data->>'GPSLatitude' IS NOT NULL;
-- Use public schema instead of media_manager

-- Enable Row Level Security
alter table if exists "public"."file_types" enable row level security;
alter table if exists "public"."media_items" enable row level security;
alter table if exists "public"."scan_folders" enable row level security;

-- File Types Table
create table if not exists "public"."file_types" (
  "id" serial primary key,
  "extension" text not null unique,
  "mime_type" text,
  "category" text not null,
  "can_display_natively" boolean default false,
  "needs_conversion" boolean default false,
  "ignore" boolean default false,
  "created_at" timestamp with time zone default now() not null
);

comment on table "public"."file_types" is 'Stores information about different file types';

-- Media Items Table
create table if not exists "public"."media_items" (
  "id" uuid primary key default gen_random_uuid(),
  "file_path" text not null unique,
  "file_name" text not null,
  "extension" text not null,
  "folder_path" text not null,
  "size_bytes" bigint not null,
  "created_date" timestamp with time zone,
  "modified_date" timestamp with time zone not null,
  "media_date" timestamp with time zone,
  "has_exif" boolean default false,
  "exif_data" jsonb,
  "thumbnail_path" text,
  "width" integer,
  "height" integer,
  "duration_seconds" numeric,
  "processed" boolean default false,
  "organized" boolean default false,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

comment on table "public"."media_items" is 'Stores information about each media file';

-- Create index on folder_path for faster folder-based queries
create index if not exists "media_items_folder_path_idx" on "public"."media_items" ("folder_path");

-- Scan Folders Table
create table if not exists "public"."scan_folders" (
  "id" serial primary key,
  "path" text not null unique,
  "include_subfolders" boolean default true,
  "last_scanned" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);

comment on table "public"."scan_folders" is 'Stores folders that should be scanned for media';

-- Create RLS policies
create policy "Allow all operations for authenticated users" 
  on "public"."file_types"
  for all 
  to authenticated 
  using (true);

create policy "Allow all operations for authenticated users" 
  on "public"."media_items" 
  for all 
  to authenticated 
  using (true);

create policy "Allow all operations for authenticated users" 
  on "public"."scan_folders" 
  for all 
  to authenticated 
  using (true);

-- Add some common file types
INSERT INTO "public"."file_types" ("extension", "mime_type", "category", "can_display_natively", "needs_conversion")
VALUES 
  ('jpg', 'image/jpeg', 'image', true, false),
  ('jpeg', 'image/jpeg', 'image', true, false),
  ('png', 'image/png', 'image', true, false),
  ('gif', 'image/gif', 'image', true, false),
  ('webp', 'image/webp', 'image', true, false),
  ('avif', 'image/avif', 'image', true, false),
  ('mp4', 'video/mp4', 'video', true, false),
  ('webm', 'video/webm', 'video', true, false),
  ('mov', 'video/quicktime', 'video', false, true),
  ('avi', 'video/x-msvideo', 'video', false, true),
  ('json', 'application/json', 'data', false, false),
  ('xmp', 'application/xml', 'metadata', false, false),
  ('heic', 'image/heic', 'image', false, true),
  ('tiff', 'image/tiff', 'image', false, true),
  ('raw', 'image/raw', 'image', false, true);
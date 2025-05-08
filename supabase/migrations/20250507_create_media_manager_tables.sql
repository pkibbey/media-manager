-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS analysis_results;
DROP TABLE IF EXISTS thumbnails;
DROP TABLE IF EXISTS exif_data;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS file_types;

-- Table for file types
CREATE TABLE file_types (
    id UUID PRIMARY KEY,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    type_name TEXT NOT NULL UNIQUE,
    type_description TEXT,
    is_ignored BOOLEAN NOT NULL DEFAULT FALSE,
    is_native BOOLEAN NOT NULL DEFAULT FALSE,
    mime_type TEXT
);

-- Table for files
CREATE TABLE files (
    id UUID PRIMARY KEY,
    file_type_id UUID NOT NULL REFERENCES file_types(id),
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    file_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table for EXIF data
CREATE TABLE exif_data (
    id UUID PRIMARY KEY,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    file_id UUID NOT NULL REFERENCES files(id),
    camera_make TEXT,
    camera_model TEXT,
    aperture FLOAT,
    exposure_time FLOAT,
    iso INTEGER,
    gps_latitude FLOAT,
    gps_longitude FLOAT,
    exif_timestamp TIMESTAMP,
    orientation TEXT,
    metering_mode TEXT,
    light_source TEXT,
    digital_zoom_ratio FLOAT,
    focal_length_35mm FLOAT,
    scene_capture_type TEXT,
    subject_distance FLOAT,
    offset_time TEXT
);

-- Table for thumbnails
CREATE TABLE thumbnails (
    id UUID PRIMARY KEY,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    file_id UUID NOT NULL REFERENCES files(id),
    thumbnail_url TEXT NOT NULL
);

-- Table for analysis results
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES files(id),
    scene_types TEXT[] NOT NULL DEFAULT '{}',
    objects JSONB[] NOT NULL DEFAULT '{}',
    colors TEXT[] NOT NULL DEFAULT '{}',
    faces JSONB[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    image_description TEXT,
    sentiment FLOAT NOT NULL DEFAULT 0.0,
    quality_score FLOAT NOT NULL DEFAULT 0.0,
    safety_level FLOAT NOT NULL DEFAULT 1.0,
    created_date TIMESTAMP NOT NULL DEFAULT NOW()
);

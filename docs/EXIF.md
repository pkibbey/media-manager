# EXIF Data Processing

## Overview

The EXIF Data Processing feature extracts, normalizes, and stores rich metadata from media files. It provides valuable information about camera settings, timestamps, GPS coordinates, and other technical details embedded within images and certain video formats. This metadata enhances searchability and organization of the media collection.

## Architecture

### Key Components

- **ExifProcessor** - Core engine for extracting and parsing EXIF data
- **ExifNormalizer** - Standardizes data formats across different sources
- **ExifDatabase** - Storage and indexing of extracted metadata
- **LocationResolver** - Handles GPS coordinates and location information

### Processing Flow

1. **Discovery**: Identify media items without EXIF data
2. **Extraction**: Read embedded metadata from source files
3. **Normalization**: Convert values to consistent formats and units
4. **Enrichment**: Add derived information from raw metadata
5. **Storage**: Persist structured metadata in the database

## Features

### Comprehensive Extraction

- Camera make, model, and settings (aperture, exposure, etc.)
- Date and time information with timezone handling
- GPS coordinates and location data
- Image orientation and dimensions
- Software information and editing history

### Data Normalization

- Standardizes date formats across different camera manufacturers
- Converts GPS coordinates to consistent decimal format
- Normalizes technical values (exposure, ISO, etc.) to searchable formats
- Handles manufacturer-specific metadata tags

### Timestamp Correction

- Detects and fixes incorrect timestamps
- Provides batch correction tools for timezone issues
- Maintains original timestamps while adding normalized versions
- Synchronizes dates across related file sets

### Location Processing

- Extracts and validates GPS coordinates
- Reverse geocodes coordinates to human-readable locations
- Handles privacy options for location information
- Provides map visualization capabilities

## Implementation

### Server Actions

```
/actions/exif/process-exif.ts - Main EXIF extraction entry point
/actions/exif/get-exif-stats.ts - Statistics retrieval
```

### Processing Libraries

- **sharp** - Core library for EXIF extraction
- **date-fns** - Date manipulation and normalization
- **geolib** - Geographical calculations and conversions

### Database Functions

- `get_unprocessed_exif_files` - Identifies files needing processing
- `get_exif_stats` - Retrieves processing statistics

## Performance Considerations

### Processing Strategies

- Implements batch processing for efficient database operations
- Uses incremental processing to handle large libraries

## Integration Points

- Enhances Media Browsing with searchable metadata
- Contributes location data to Media Analysis
# Thumbnail Generation

## Overview

The Thumbnail Generation feature automatically creates optimized preview images for media files. It supports both images and videos, producing consistent, high-quality thumbnails that enhance browsing performance while maintaining visual quality.

## Architecture

### Key Components

- **ThumbnailProcessor** - Core processing engine for generating thumbnails
- **ThumbnailQueue** - Background queue manager for thumbnail generation tasks
- **ThumbnailStats** - Status tracking and reporting for thumbnail operations

### Processing Flow

1. **Discovery**: Identify media items without thumbnails through database queries
2. **Queuing**: Add items to a priority-based generation queue
3. **Processing**: Create thumbnails with appropriate dimensions and formats
4. **Storage**: Save thumbnails to Supabase storage with optimized settings
5. **Database Update**: Record thumbnail URLs and processing status

## Features

### Format Optimization

- Generates Jpeg thumbnails
- Creates one resolution for display, optimized for VLMs

### Video Support

- Extracts representative frames from videos using fluent-ffmpeg
- Supports time-based frame selection for consistent thumbnails

## Implementation

### Server Actions

```
/actions/thumbnails/generate-thumbnails.ts - Main generation entry point
/actions/thumbnails/get-thumbnail-stats.ts - Statistics retrieval
```

### Processing Libraries

- **Sharp** - High-performance image processing
- **fluent-ffmpeg** - Video frame extraction


### Database Functions

- `get_unprocessed_thumbnail_files_function` - Finds media needing thumbnails
- `thumbnail_stats_function` - Retrieves generation statistics

## Performance Considerations

### Storage Efficiency

- Uses content-addressed storage to prevent duplicates

## Integration Points

- Provides thumbnails to the Media Browsing interface
- Connects with the Admin Dashboard for manual regeneration
- Feeds into the Analysis system for visual content processing
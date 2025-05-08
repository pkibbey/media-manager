# Admin Dashboard

## Overview

The Admin Dashboard provides a centralized interface for managing all aspects of the Media Manager application. It enables administrators to monitor processing status, trigger background tasks, manage content settings, and ensure system health. The dashboard is designed for efficient management of large media collections with minimal manual intervention.

## Architecture

### Key Components

- **AdminLayout** - Container layout with navigation sidebar and authentication checks
- **StatsCards** - Reusable components for displaying processing statistics
- **ActionPanels** - Sectioned interfaces for manual control of system processes
- **ProcessingQueue** - Visual representation of pending and active background tasks
- **HealthMonitor** - System status display for critical services

### Navigation Structure

The Admin Dashboard is organized into functional sections:

1. **Overview** - Summary statistics and system health indicators
2. **Media Scan** - Directory scanning and media import controls
3. **File Types** - Management of supported media formats and processing rules
4. **EXIF Processing** - EXIF extraction monitoring and manual controls
5. **Analysis** - AI analysis status, results review, and reprocessing tools
6. **Thumbnails** - Thumbnail generation status and manual regeneration options
7. **Settings** - Application configuration and user preferences

## Features

### Media Scanning

- Directory browser for selecting media sources
- Import status tracking with progress indicators
- Duplicate detection and conflict resolution
- Batch import controls with priority settings
- Failed import reports with troubleshooting assistance

### File Type Management

- Supported format listing with mime types and extensions
- Processing priority configuration for each file type
- Ignore rules for specific file patterns
- File type statistics with distribution charts
- Custom processor assignment for specialized formats

### EXIF Processing

- Processing status overview with completion percentages
- Error rate monitoring and batch reprocessing tools
- EXIF data visualization with common field statistics
- Manual correction tools for timestamp and GPS data
- Batch export options for external processing

### Analysis Management

- Analysis queue monitoring with priority controls
- Result review interface with filtering options
- Model performance statistics and quality metrics
- Manual tagging and correction interface
- Reprocessing triggers for outdated results

### Thumbnail Controls

- Generation status monitoring with visual samples
- Quality and format configuration options
- Batch regeneration tools with filtering capabilities
- Storage utilization statistics and optimization tools
- Preview testing across different resolutions

### System Health Monitoring

- Database connection status and query performance
- Storage usage statistics and quota management
- Processing queue length and throughput metrics
- Error logs with filtering and export options
- Background service status indicators

## Implementation

### Server Actions

```
/actions/admin/scan-directory.ts - Directory scanning and file discovery
/actions/admin/process-batch.ts - Generic batch processing controller
/actions/admin/update-settings.ts - Application settings management
/actions/admin/monitor-health.ts - System status checking
/actions/admin/manage-file-types.ts - File type configuration
```

### Admin Components

```
/components/admin/layout.tsx - Main admin layout with navigation
/components/admin/stats-card.tsx - Reusable statistics display
/components/admin/action-button.tsx - Standardized action trigger
/components/admin/processing-queue.tsx - Background task visualization
/components/admin/health-monitor.tsx - System status display
```

### Pages Structure

```
/app/admin/page.tsx - Dashboard overview
/app/admin/scan/page.tsx - Media scanning interface
/app/admin/file-types/page.tsx - File type management
/app/admin/exif/page.tsx - EXIF processing controls
/app/admin/analysis/page.tsx - Analysis management
/app/admin/thumbnails/page.tsx - Thumbnail controls
/app/admin/settings/page.tsx - Application settings
```

## Performance Considerations

### Efficient State Updates

- Uses optimistic UI updates for immediate feedback
- Implements background polling for status updates
- Applies throttling to prevent excessive database queries
- Uses WebSockets for real-time progress notification

### Resource Management

- Implements priority-based scheduling for processing tasks
- Provides controls for limiting concurrent operations
- Monitors system resource utilization to prevent overload
- Applies adaptive batch sizing based on system performance

## Integration Points

- Connects with EXIF processing for metadata extraction control
- Interfaces with Analysis features for content understanding
- Manages Thumbnail generation for visual previews
- Provides data for Media Browsing experience optimization
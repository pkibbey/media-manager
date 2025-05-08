# Shared Processing Architecture

## Overview

Media Manager implements a unified processing architecture that powers all media processing operations: EXIF extraction, thumbnail generation, image analysis, and folder scanning. This shared foundation ensures consistent behavior, code reuse, and a uniform user experience across different processing features.

## Core Components

### Processing Controller Interface

All processing features implement a common interface defined in the processing architecture:

```typescript
interface ProcessingController<TProgress, TStats> {
  // State
  isProcessing: boolean;
  progress: TProgress | null;
  stats: TStats;
  
  // Configuration
  method: Method;
  batchSize: number;
  
  // Actions
  startProcessing: (options: { processAll?: boolean }) => Promise<void>;
  stopProcessing: () => void;
  refreshStats: () => Promise<void>;
}
```

### Base Processing Hook

The `useProcessorBase` hook forms the foundation for all processing features, handling:

- Stream management for real-time updates
- Progress tracking and statistics
- Error handling and recovery
- Process cancellation
- Resource management
- Consistent state updates

Each specific processor (EXIF, thumbnails, analysis, folders) extends this base with domain-specific logic.

### Unified Progress and Stats

All processors use standardized data structures:

```typescript
// Common progress tracking format
interface UnifiedProgress {
  totalCount: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  currentItem?: string;
  rate?: number;
}

// Common statistics format
interface UnifiedStats {
  status: 'processing' | 'success' | 'failure';
  counts: {
    total: number;
    success?: number;
    failed?: number;
    pending?: number;
  };
  percentages?: {
    completed?: number;
    error?: number;
  };
}
```

### Streaming Data Architecture

All processing features use a consistent streaming pattern:

1. Client calls server action that returns a `ReadableStream`
2. Server creates a `TransformStream` for progress updates
3. Server processes items in the background, writing progress to the stream
4. Client consumes the stream to update UI in real-time

### Method-Based Processing

Each processor supports different processing methods via a shared `Method` type:

- EXIF processing: Different extraction strategies (`default`, `marker-only`, etc.)
- Thumbnails: Various generation approaches (`default`, `embedded-preview`, `downscale-only`)
- Analysis: Processing modes based on depth and speed (`default`, `fast`, `detailed`)

### Shared Processing Helpers

Common utility functions used by all processors:

```typescript
// Success/failure tracking
markProcessingSuccess({ mediaItemId, progressType, errorMessage });
markProcessingError({ mediaItemId, progressType, errorMessage });
sendStreamProgress(encoder, writer, progressData);
```

## UI Components

### Unified Display Components

Standardized components render consistent UI across processors:

- `UnifiedProgressDisplay` - Shows real-time progress with statistics
- `UnifiedStatsDisplay` - Displays summary statistics for completed operations
- `ProcessingTimeEstimator` - Provides time remaining estimates

### Common Control Patterns

All processing features implement consistent UI controls:

- Processing options (method selection, batch size)
- Action buttons (start/cancel processing)
- Error summaries and reporting
- Status indicators and progress bars

## Database Integration

Processing state is tracked consistently across features using a unified database schema:

- `processing_states` table for tracking status
- RPC functions for retrieving unprocessed items
- Standardized functions for statistics retrieval

This shared architecture enables Media Manager to process different types of media data with consistent behavior, error handling, and user experience while allowing for domain-specific optimizations in each processor implementation.
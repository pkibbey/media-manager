# Media Manager - Codebase Overview

Media Manager is a modern web application for organizing, viewing, and processing media collections. This document provides a high-level overview of the codebase architecture and key components.

## Core Architecture

The application is built with **Next.js 15** using the **App Router** and follows a clear separation of concerns:

- **Server Components** - Handle data fetching and initial rendering
- **Client Components** - Manage interactive UI elements and state
- **Server Actions** - Process data mutations and intensive operations

## Key Features

1. **Media Browsing** - Browse and filter media with advanced search options
2. **Thumbnail Generation** - Automatic thumbnail creation for images and videos
3. **EXIF Data Processing** - Extract and normalize metadata from media files
4. **Media Analysis** - AI-powered content analysis and categorization
5. **Admin Dashboard** - Management interface for processing and statistics

## Key Patterns

### Processing Architecture

Media processing follows a unified pattern across different processing types:

```typescript
// Consistent controller interface for all processors
interface ProcessingController<TProgress, TStats> {
  isProcessing: boolean;
  progress: TProgress | null;
  stats: TStats;
  startProcessing: (options) => Promise<void>;
  stopProcessing: () => void;
  refreshStats: () => Promise<void>;
}
```

### Component Architecture

Components follow a hierarchical pattern:

1. **Container Components** - Handle data and state management
2. **Context Providers** - Supply shared state to component trees
3. **Presentation Components** - Render UI based on props

### Statistics and Progress Reporting

All processing operations use a standardized stats interface:

```typescript
interface UnifiedStats {
  status: 'processing' | 'success' | 'failure';
  counts: {
    total: number;
    success?: number;
    failed?: number;
    // ...other counts
  };
  percentages?: {
    completed?: number;
    error?: number;
  };
}
```

## Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Database**: Supabase PostgreSQL with RPC functions
- **Storage**: Supabase Storage
- **Styling**: Tailwind CSS with shadcn/ui components
- **Media Processing**: Sharp, fluent-ffmpeg, exif-reader
- **Data Validation**: Zod schemas

## Development Standards

The codebase follows strict standards documented in the `STANDARDS.md` file.
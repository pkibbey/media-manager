# Media Manager - Standards Amendment v2

This document serves as an amendment to the [original standards document](./standards.md) based on a review of the current implementation patterns and evolved best practices in the codebase.

## Table of Contents

1. [Data Processing Architecture](#data-processing-architecture)
2. [Standardized Stats and Progress Reporting](#standardized-stats-and-progress-reporting)
3. [Processing State Management](#processing-state-management)
4. [Streaming Data Processing](#streaming-data-processing)
5. [React Component Hierarchy](#react-component-hierarchy)
6. [Hook Composition Patterns](#hook-composition-patterns)
7. [Data Attribute-Based Styling](#data-attribute-based-styling)
8. [Accessibility Enhancements](#accessibility-enhancements)
9. [UI State Management](#ui-state-management)

## Data Processing Architecture

The codebase has evolved consistent patterns for data processing operations:

### Pipeline-Based Processing

- Processing operations follow a standard pipeline pattern:
  - **Fetch** unprocessed items from database
  - **Process** items in batches
  - **Update** processing state
  - **Stream** progress updates to client
  - **Report** final results

### Processing Context

- All processing operations maintain contextual state:
  - Current batch progress
  - Overall progress across batches
  - Error collection and reporting
  - Abort/cancellation support

```typescript
// Example processing context flow
const {
  isProcessing,
  progress,
  hasError,
  errorSummary,
  // Additional state...
} = useProcessorBase<ExifProgress, UnifiedStats>({
  fetchStats,
  getStreamFunction,
  defaultBatchSize: BATCH_SIZE,
  // Configuration options...
});
```

## Standardized Stats and Progress Reporting

### UnifiedStats Pattern

The application uses a standardized `UnifiedStats` interface for consistent statistics reporting across all processing types, replacing fragmented stat reporting mechanisms.

```typescript
// Reference to original document: TypeScript Usage section
export interface UnifiedStats {
  status: 'processing' | 'success' | 'error';
  message?: string;
  error?: string;
  counts: {
    total: number;
    success?: number;
    failed?: number;
    skipped?: number;
    ignored?: number;
  };
  percentages?: {
    completed?: number;
    error?: number;
  };
}
```

### Consistent Response Structure

All stats functions return a consistent response structure:

```typescript
export interface StatsResponse<T extends UnifiedStats = UnifiedStats> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## Processing State Management

Processing state management has been standardized with dedicated utility functions:

### Standard Processing States

- All processing operations use standardized status values:
  - `processing`: Operation is in progress
  - `success`: Operation completed successfully
  - `error`: Operation encountered an error
  - `skipped`: Item was intentionally skipped
  - `aborted`: Operation was manually canceled
  - `failed`: Operation failed for messages other than error

### Process State Helpers

- Helper functions ensure consistent state management:
  - `markProcessingStarted`
  - `markProcessingSuccess`
  - `markProcessingError`
  - `markProcessingSkipped`
  - `markProcessingAborted`
  - `markProcessingFailed`
  
```typescript
// Example from processing-helpers.ts
export async function markProcessingError({
  mediaItemId,
  type,
  error,
}: {
  mediaItemId: string;
  type: string;
  error: unknown;
}): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  try {
    await updateProcessingState({
      media_item_id: mediaItemId,
      status: 'error',
      type,
      error_message: errorMessage,
    });
  } catch (updateError) {
    console.error(`Failed to update processing state to 'error':`, updateError);
  }
}
```

## Streaming Data Processing

### Stream-Based Progress Reporting

For long-running operations, the application has standardized on streaming progress updates:

```typescript
// Reference to original document: Performance Considerations section
export function useStreamProcessing<T extends UnifiedProgress>() {
  // Stream processing implementation...
}
```

### Server-Side Streaming

Server actions use the TransformStream API to stream progress updates to clients:

```typescript
// Example pattern
export async function streamExifData({ /* params */ }) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Start processing in background
  processItemsInternal({ writer, /* params */ }).catch((error) => {
    // Handle errors and cleanup
  });
  
  // Return the readable part of stream to client
  return stream.readable;
}
```

### Abort Handling

- All streaming operations support abort signaling
- Operations clean up resources on abort
- Processing states are properly updated on abort

## React Component Hierarchy

### Component Composition Pattern

Components are organized in a more structured hierarchy with clear responsibility boundaries:

1. **Container Components**: Manage data fetching and state
2. **Provider Components**: Supply context to child components 
3. **View Components**: Handle rendering and UI interactions
4. **Primitive Components**: Provide basic interactive elements

### File Organization Pattern

Complex component groupings follow a consistent structure beyond what was documented in the original standards:

```
/component-name/
  index.tsx          # Main export, composing sub-components
  ComponentContext.tsx  # Provides context if needed
  ComponentContainer.tsx  # Container component with data management
  ComponentView.tsx  # Presentational component
  useComponentLogic.ts  # Custom hook for component logic
  types.ts  # Component-specific type definitions
```

## Hook Composition Patterns

### Base and Specialized Hooks

The codebase uses a pattern of base hooks composed with specialized hooks:

```typescript
// Base hook provides common functionality
export function useProcessorBase<TProgress, TStats>() {
  // Common processor functionality
}

// Specialized hook adds specific behavior
export function useExifProcessor() {
  // Use the processor base hook with EXIF-specific configuration
  const baseProcessor = useProcessorBase<ExifProgress, UnifiedStats>({
    // Configuration...
  });
  
  // Add EXIF-specific functionality
  
  return {
    // Return combined API
    ...baseProcessor,
    // Additional EXIF-specific properties/methods
  };
}
```

### Hook Function Generators

Hooks use function generators to enable parameterized streaming:

```typescript
// Example pattern
const getStreamFunction = useCallback(
  (options: { batchSize: number; method: string }) => {
    return () => streamExifData({
      extractionMethod: options.method as ExtractionMethod,
      batchSize: options.batchSize,
    });
  },
  [],
);
```

## Data Attribute-Based Styling

### Component State Styling

The UI uses data attributes extensively to style components based on their state:

```css
/* Example pattern */
.data-\[state\=checked\]\:bg-primary {
  &[data-state="checked"] {
    background-color: var(--primary);
  }
}
```

### Semantic Data Attributes

Components use semantic data attributes for styling and accessibility:

```tsx
// Example pattern
<div 
  data-slot="form-item"
  data-error={!!error}
  className={cn('data-[error=true]:text-destructive', className)}
/>
```

## Accessibility Enhancements

### Keyboard Navigation

Components implement full keyboard navigation patterns:

```typescript
// Example from MediaListContainer
const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
  // Handle Ctrl+A to select all items
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault();
    selectAll();
  }
};
```

### Focus Management

Components manage focus explicitly for improved accessibility:

```tsx
// Focus management pattern
const buttonRef = useRef<HTMLButtonElement>(null);
useEffect(() => {
  if (isOpen) {
    buttonRef.current?.focus();
  }
}, [isOpen]);
```

## UI State Management

### Filtering and Pagination Pattern

The application uses a consistent pattern for filtered data views:

1. URL-based filter state using search parameters
2. Local state synchronized with URL parameters
3. Debounced updates to avoid excessive API calls
4. Pagination controls with URL state

```tsx
// Example pattern from BrowsePage
// Parse page from URL on initial load
useEffect(() => {
  const pageParam = searchParams.get('page');
  if (pageParam) {
    const parsedPage = Number.parseInt(pageParam, 10);
    if (!Number.isNaN(parsedPage) && parsedPage > 0) {
      setCurrentPage(parsedPage);
    }
  }
  
  // Parse other filter parameters...
}, [searchParams]);
```

### Context-Based Selection Management

The application uses context providers for selection management:

```tsx
// Example from media list components
<MediaSelectionContext.Provider value={mediaSelectionContext}>
  {/* Components that need selection capabilities */}
</MediaSelectionContext.Provider>
```

---

This document is a living guide that will continue to evolve alongside the codebase. All developers should refer to both this amendment and the original standards document when contributing to the project.
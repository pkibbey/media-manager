# Media Manager - Standards Amendment v4

This document serves as the fourth amendment to the Media Manager coding standards, building upon the [original standards document](./standards_v1.md), the [V2 amendment](./standards_v2.md), and the [V3 amendment](./standards_v3.md). It reflects the continued evolution of patterns, practices, and architectural refinements observed in the current codebase as of May 2025.

## Table of Contents

1. [Advanced Processing System](#advanced-processing-system)
2. [Enhanced Hook Architecture](#enhanced-hook-architecture)
3. [Next.js 15 App Router Migration](#nextjs-15-app-router-migration)
4. [Progressive Rendering Strategies](#progressive-rendering-strategies)
5. [Supabase Integration Enhancements](#supabase-integration-enhancements)
6. [Media Processing Optimizations](#media-processing-optimizations)
7. [Resilience Engineering](#resilience-engineering)
8. [Declarative UI Patterns](#declarative-ui-patterns)
9. [Server Component Best Practices](#server-component-best-practices)
10. [TypeScript Pattern Evolution](#typescript-pattern-evolution)
11. [Unified Testing Strategy](#unified-testing-strategy)

## Advanced Processing System

The processing architecture has been further refined with a modular system that ensures consistent behavior across all processing types (EXIF, thumbnails, analysis, etc.):

### Unified Processing Interface

All processing types now implement a common interface:

```typescript
export interface ProcessingController<TProgress, TStats> {
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

### Resource-Aware Processing

Processing operations now implement resource monitoring and adaptive processing:

```typescript
function createResourceAwareProcessor({
  maxConcurrency = navigator.hardwareConcurrency || 4,
  memoryThreshold = 0.8, // 80% of available memory
  adaptiveBatching = true,
} = {}) {
  return {
    // Monitor system resources and adapt processing parameters
    adjustParameters: (baseParams) => {
      // Implementation that adapts batch size, concurrency, etc.
      // based on current system resource availability
    },
    
    // Resource cleanup
    releaseResources: () => {
      // Implementation that ensures proper cleanup
    }
  };
}
```

### Processing Registry

A centralized registry tracks all active processing operations and allows for system-wide control:

```typescript
// Example usage
const processingRegistry = createProcessingRegistry();

// Register a processor
const processorId = processingRegistry.register({
  type: 'exif',
  controller: exifProcessorController,
  priority: ProcessingPriority.HIGH,
});

// Global operations
processingRegistry.pauseAll();
processingRegistry.resumeAll();
processingRegistry.getResourceUtilization();
```

## Enhanced Hook Architecture

The hook architecture has matured with advanced patterns for composition, reuse, and state management:

### Hierarchical Hook Composition

Hooks are now organized in a hierarchical structure with clear dependencies:

```typescript
// Base layer - primitive hooks for core functionality
function useAbortController() { /* ... */ }
function useAsyncState<T>() { /* ... */ }

// Intermediate layer - domain-specific base hooks
function useProcessorBase<TProgress, TStats>() { /* ... */ }
function useStreamProcessing<T extends UnifiedProgress>() { /* ... */ }

// Feature layer - application-specific hooks
function useExifProcessor() { /* ... */ }
function useThumbnailGenerator() { /* ... */ }
```

### Effect Orchestration

Complex effect dependencies are managed using dedicated orchestration patterns:

```typescript
function useEffectOrchestrator(effects: {
  id: string;
  dependencies: string[];
  effect: () => void | (() => void);
  cleanup?: () => void;
}[]) {
  // Implementation that ensures effects run in the correct order
  // based on their dependencies, regardless of when they are defined
}

// Example usage
useEffectOrchestrator([
  {
    id: 'fetchData',
    dependencies: [],
    effect: () => {
      // Fetch initial data
    },
  },
  {
    id: 'processData',
    dependencies: ['fetchData'],
    effect: () => {
      // Process data after it's fetched
    },
  },
]);
```

### Memoization Strategy

Consistent memoization strategies are applied to prevent unnecessary re-renders:

```typescript
// Prefer object destructuring with explicit dependencies
const memoizedValue = useMemo(
  () => computeExpensiveValue(a, b),
  [a, b]
);

// For functions, use parameter objects to make dependencies clearer
const handleSubmit = useCallback(
  ({ id, value }: SubmitParams) => {
    // Implementation
  },
  [dependency1, dependency2]
);

// For complex objects, use stable references
const formConfig = useStableObject({
  initialValues,
  validationSchema,
  onSubmit: handleSubmit,
});
```

## Next.js 15 App Router Migration

With the application fully migrated to Next.js 15 App Router, these patterns have been standardized:

### Server Component Architecture

The application follows a clear pattern for server vs. client components:

```
app/
  layout.tsx           # Server component (root layout)
  page.tsx             # Server component (page)
  actions/            
    scan/
      process-scan.ts  # Server action
  browse/
    page.tsx           # Server component with client islands
```

### Data Flow Architecture

- **Model Layer**: Database schema and generated types
- **Service Layer**: Server-side operations and business logic
- **Component Layer**: UI components that use service layer

```typescript
// Service layer example (server-side)
export async function getMediaItems(options: MediaQueryOptions) {
  "use server";
  
  // Implementation using Supabase or other data sources
}

// Component layer example (server component)
export default async function BrowsePage() {
  // Fetch data directly in server component
  const mediaItems = await getMediaItems({ limit: 50 });
  
  // Pass data to client components
  return <MediaBrowser initialItems={mediaItems} />;
}
```

### Hybrid Rendering Strategy

The application employs a hybrid rendering strategy:

- **Static content**: Prerendered at build time with ISR for updates
- **Dynamic content**: Rendered on-demand with streaming SSR
- **Interactive elements**: Client-side hydration with islands architecture

## Progressive Rendering Strategies

The application implements sophisticated progressive rendering techniques:

### Streaming Response Pattern

Server components and actions use the streaming pattern with React Suspense:

```tsx
// Server component with progressive rendering
export default function MediaGalleryPage() {
  return (
    <>
      <MediaGalleryHeader />
      
      {/* Instantly rendered */}
      <MediaFilterBar />
      
      {/* Streamed with loading state */}
      <Suspense fallback={<MediaGridSkeleton />}>
        <MediaGridContainer />
      </Suspense>
      
      {/* Lower priority, streamed later */}
      <Suspense fallback={<div className="h-40" />}>
        <MediaStatistics />
      </Suspense>
    </>
  );
}
```

### Prioritized Content Loading

Content loading is prioritized to optimize perceived performance:

```typescript
// Progressive hydration with priority levels
function useProgressiveHydration(priority: 'critical' | 'main' | 'deferred') {
  const [shouldHydrate, setShouldHydrate] = useState(priority === 'critical');
  
  useEffect(() => {
    if (priority === 'main') {
      // Hydrate after main content is visible
      setShouldHydrate(true);
    } else if (priority === 'deferred') {
      // Hydrate during idle time or when visible in viewport
      const id = requestIdleCallback(() => setShouldHydrate(true));
      return () => cancelIdleCallback(id);
    }
  }, [priority]);
  
  return shouldHydrate;
}
```

### Media Load Optimization

Media assets are loaded with adaptive quality based on connection and device:

```typescript
// Example of adaptive media loading
function AdaptiveMediaLoader({ src, width, height }) {
  const { quality, loading } = useAdaptiveQuality();
  
  return (
    <Image
      src={src}
      width={width}
      height={height}
      quality={quality}
      loading={loading}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

## Supabase Integration Enhancements

The Supabase integration layer has been refined with advanced patterns:

### Stored Procedures Migration

Complex database operations have been migrated to Postgres functions:

```sql
-- Example of PostgreSQL function for complex operations
CREATE OR REPLACE FUNCTION get_media_items_with_filters(
  p_folder_ids UUID[],
  p_media_types TEXT[],
  p_date_from DATE,
  p_date_to DATE,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  file_path TEXT,
  file_name TEXT,
  -- Additional fields
) AS $$
BEGIN
  -- Complex query logic
  RETURN QUERY
  SELECT 
    mi.id,
    mi.file_path,
    mi.file_name,
    -- Additional fields
  FROM media_items mi
  WHERE
    -- Complex filtering conditions
  ORDER BY
    mi.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Data Access Patterns

All database access now follows standardized patterns:

```typescript
// Typed RPC calls
export async function getMediaStats(): Promise<StatsResponse<UnifiedStats>> {
  try {
    const { data, error } = await supabaseServerClient.rpc(
      'get_media_stats'
    );
    
    if (error) throw error;
    
    return {
      success: true,
      data: normalizeStats(data),
    };
  } catch (error) {
    logError('Database Error', error);
    return {
      success: false,
      error: formatErrorMessage(error),
    };
  }
}
```

### Realtime Subscription Management

A standardized pattern for realtime subscriptions:

```typescript
function useSupabaseSubscription<T>({
  channel,
  event,
  schema,
  table,
  filter,
  onData,
}: SubscriptionOptions<T>) {
  useEffect(() => {
    const subscription = supabaseClient
      .channel(channel)
      .on(
        event,
        filter,
        (payload) => {
          const validatedData = validatePayload<T>(payload, schema);
          if (validatedData) {
            onData(validatedData);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabaseClient.removeChannel(subscription);
    };
  }, [channel, event, schema, table, filter, onData]);
}
```

## Media Processing Optimizations

Media processing has been optimized for better performance:

### Adaptive Processing Strategy

Processing adapts to different media types and sizes:

```typescript
// Dynamic batch size calculation based on media type and size
function calculateOptimalBatchSize(items: MediaItem[]): number {
  const averageFileSize = items.reduce(
    (sum, item) => sum + (item.file_size || 0),
    0
  ) / items.length;
  
  // Larger files = smaller batches
  if (averageFileSize > 10 * 1024 * 1024) { // > 10MB
    return 5;
  } else if (averageFileSize > 5 * 1024 * 1024) { // > 5MB
    return 10;
  } else {
    return 20;
  }
}
```

### Media Format Optimizations

The application now supports next-generation media formats:

```typescript
// Format selection based on browser support
function selectOptimalFormat(formats: MediaFormat[]): MediaFormat {
  const webpSupport = hasWebPSupport();
  const avifSupport = hasAvifSupport();
  
  if (avifSupport && formats.includes('avif')) {
    return 'avif'; // Best compression, newer browsers
  } else if (webpSupport && formats.includes('webp')) {
    return 'webp'; // Good compression, wide support
  } else {
    return 'jpg'; // Fallback format
  }
}
```

### Background Processing Queue

Long-running operations are managed by a background processing queue:

```typescript
// Background queue with priority management
type ProcessingJob = {
  id: string;
  type: string;
  priority: number;
  execute: () => Promise<void>;
};

// Usage example
backgroundQueue.add({
  id: 'thumbnail-generation-batch-1',
  type: 'thumbnail',
  priority: 2,
  execute: () => generateThumbnailBatch(batch1),
});
```

## Resilience Engineering

The application incorporates advanced resilience engineering patterns:

### Structured Error Classification

Errors follow a structured classification system:

```typescript
// Enhanced error classification system
export enum ErrorSeverity {
  FATAL,    // Application cannot function
  CRITICAL, // Feature is completely broken
  WARNING,  // Feature degraded but usable
  INFO      // Non-critical information
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly severity: ErrorSeverity,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'AppError';
  }
  
  isRetryable(): boolean {
    return !([
      ErrorCategory.VALIDATION,
      ErrorCategory.AUTHORIZATION,
    ] as const).includes(this.category);
  }
}
```

### Telemetry Integration

The application collects telemetry for monitoring and improvement:

```typescript
// Anonymized telemetry for performance monitoring
function recordProcessingMetrics({
  operation,
  itemCount,
  duration,
  success,
  errorType,
}: ProcessingMetric) {
  // Only collect non-PII data
  sendTelemetry({
    eventName: 'processing_operation',
    properties: {
      operation,
      itemCount,
      durationMs: duration,
      success,
      errorType: errorType || 'none',
      // No user or file identifiers
    },
  });
}
```

### Circuit Breaker Implementation

Service calls implement circuit breaker pattern to prevent cascading failures:

```typescript
// Circuit breaker pattern implementation
function createCircuitBreaker<T>({
  operation,
  failureThreshold = 3,
  resetTimeout = 30000,
}: CircuitBreakerOptions<T>): CircuitBreaker<T> {
  let failures = 0;
  let lastFailureTime = 0;
  let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  return async function execute(...args: unknown[]): Promise<T> {
    if (state === 'OPEN') {
      // Check if timeout has elapsed to try again
      if (Date.now() - lastFailureTime >= resetTimeout) {
        state = 'HALF_OPEN';
      } else {
        throw new AppError(
          'Service temporarily unavailable',
          ErrorCategory.NETWORK,
          ErrorSeverity.WARNING
        );
      }
    }
    
    try {
      const result = await operation(...args);
      
      // Success - reset circuit breaker
      if (state === 'HALF_OPEN') {
        state = 'CLOSED';
        failures = 0;
      }
      
      return result;
    } catch (error) {
      lastFailureTime = Date.now();
      failures++;
      
      // If threshold reached, open the circuit
      if (failures >= failureThreshold) {
        state = 'OPEN';
      }
      
      throw error;
    }
  };
}
```

## Declarative UI Patterns

UI components follow a declarative pattern for consistency:

### Compound Component Pattern

Complex UI components use the compound component pattern:

```tsx
// Compound component example
const MediaBrowser = {
  Root: ({ children }: { children: React.ReactNode }) => (
    <MediaBrowserProvider>{children}</MediaBrowserProvider>
  ),
  
  Filters: () => <MediaFilters />,
  
  Grid: ({ layout }: { layout: 'grid' | 'list' }) => (
    <MediaGrid layout={layout} />
  ),
  
  Pagination: () => <MediaPagination />,
  
  EmptyState: ({ message }: { message?: string }) => (
    <MediaEmptyState message={message} />
  ),
};

// Usage
<MediaBrowser.Root>
  <MediaBrowser.Filters />
  <MediaBrowser.Grid layout="grid" />
  <MediaBrowser.Pagination />
</MediaBrowser.Root>
```

### State Machines for UI Logic

Complex UI states are managed with state machines:

```typescript
// State machine for media selection mode
const selectionMachine = createMachine({
  id: 'selection',
  initial: 'idle',
  states: {
    idle: {
      on: {
        SELECT_ITEM: { target: 'selecting' },
      },
    },
    selecting: {
      on: {
        SELECT_ITEM: { target: 'selecting' },
        DESELECT_ALL: { target: 'idle' },
        PERFORM_ACTION: { target: 'processing' },
      },
    },
    processing: {
      on: {
        COMPLETE: { target: 'idle' },
        ERROR: { target: 'error' },
      },
    },
    error: {
      on: {
        RETRY: { target: 'processing' },
        CANCEL: { target: 'selecting' },
      },
    },
  },
});
```

### Form Composition Pattern

Forms follow a consistent composition pattern with validation:

```tsx
// Form composition pattern
function MediaFilterForm() {
  const form = useForm({
    schema: filterFormSchema,
    defaultValues: {
      mediaTypes: [],
      dateRange: { from: null, to: null },
      tags: [],
    },
  });
  
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="mediaTypes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Media Types</FormLabel>
            <MediaTypeSelector
              {...field}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Additional form fields */}
    </Form>
  );
}
```

## Server Component Best Practices

Server components follow established best practices:

### Data Loading Patterns

Data loading in server components follows a consistent pattern:

```tsx
// Server component with data loading
export default async function MediaStatsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { view?: string };
}) {
  // Parallel data fetching for independent data
  const [mediaStats, userPreferences] = await Promise.all([
    getMediaStats(params.id),
    getUserPreferences(),
  ]);
  
  // Sequential data fetching for dependent data
  const mediaDetails = await getMediaDetails(params.id);
  const relatedMedia = await getRelatedMedia(mediaDetails.tags);
  
  // Error handling
  if (!mediaStats.success) {
    return <MediaStatsError error={mediaStats.error} />;
  }
  
  // Render UI with data
  return (
    <MediaStatsContainer
      stats={mediaStats.data}
      details={mediaDetails}
      related={relatedMedia}
      view={searchParams.view || 'summary'}
    />
  );
}
```

### Server Action Patterns

Server actions follow a standardized pattern:

```typescript
'use server'

// Validation schema
const processingParamsSchema = z.object({
  mediaIds: z.array(z.string().uuid()),
  processType: z.enum(['exif', 'thumbnail', 'analysis']),
  options: z.object({
    batchSize: z.number().int().positive(),
  }).optional(),
});

// Server action with validation
export async function processMediaItems(
  formData: FormData | Record<string, unknown>
) {
  // Extract data from form or direct call
  const rawData = formData instanceof FormData
    ? Object.fromEntries(formData.entries())
    : formData;
  
  // Validate input
  const validationResult = processingParamsSchema.safeParse(rawData);
  if (!validationResult.success) {
    return {
      success: false,
      error: formatZodErrors(validationResult.error),
    };
  }
  
  const { mediaIds, processType, options } = validationResult.data;
  
  // Authorization check
  const { user } = await getServerSession();
  if (!user || !canUserProcessMedia(user)) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }
  
  try {
    // Perform action
    const result = await processMediaItemsInternal({
      mediaIds,
      processType,
      options,
      userId: user.id,
    });
    
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logError('Processing failed', error);
    return {
      success: false,
      error: formatErrorMessage(error),
    };
  }
}
```

### Progressive Enhancement

Server components are designed with progressive enhancement:

```tsx
// Progressive enhancement pattern
function MediaControlPanel() {
  return (
    <div className="control-panel">
      {/* Works without JS */}
      <form action="/api/media/process" method="post">
        <input type="hidden" name="processType" value="exif" />
        <button type="submit" className="btn btn-primary">
          Process EXIF
        </button>
      </form>
      
      {/* Enhanced with JS */}
      <ClientControlPanel />
    </div>
  );
}

// Client component adds interactivity
'use client'
function ClientControlPanel() {
  const [isProcessing, startProcessing] = useProcessAction(processMediaItems);
  
  return (
    <div className="advanced-controls">
      <button 
        onClick={() => startProcessing({ processType: 'exif' })}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Process EXIF with Streaming'}
      </button>
    </div>
  );
}
```

## TypeScript Pattern Evolution

TypeScript patterns have evolved for better type safety:

### Advanced Type Utilities

The application uses advanced type utilities:

```typescript
// Extract properties with specific type
type ExtractPropertiesOfType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

// Example usage
type MediaItemDateFields = ExtractPropertiesOfType<
  MediaItem,
  Date | null
>;

// Type-safe omit with exact property names
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Non-nullable type
type NonNullable<T> = T extends null | undefined ? never : T;

// Function parameter and return types
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : never;
```

### API Contract Types

API contracts are defined with strict types:

```typescript
// API request/response contract
export type ApiRequest<T> = {
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  body?: T;
};

export type ApiResponse<T> = 
  | { success: true; data: T; message?: string }
  | { success: false; error: string; details?: unknown };

// Endpoint definition
export interface ApiEndpoint<Req, Res> {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  request: ApiRequest<Req>;
  response: ApiResponse<Res>;
}

// Type-safe API call
export async function apiCall<Req, Res>({
  endpoint,
  params,
  query,
  body,
}: {
  endpoint: ApiEndpoint<Req, Res>;
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  body?: Req;
}): Promise<ApiResponse<Res>> {
  // Implementation
}
```

### Advanced Type Guards

Type guards are used consistently for runtime type safety:

```typescript
// Type guard with type predicate
function isMediaImage(
  item: MediaItem
): item is MediaItem & { type: 'image'; width: number; height: number } {
  return (
    item.type === 'image' &&
    typeof item.width === 'number' &&
    typeof item.height === 'number'
  );
}

// Usage in conditional logic
function renderMediaItem(item: MediaItem) {
  if (isMediaImage(item)) {
    // TypeScript knows item.width and item.height exist
    return <ImageRenderer width={item.width} height={item.height} />;
  } else {
    // Handle non-image case
    return <GenericMediaRenderer />;
  }
}
```

## Unified Testing Strategy

The project now includes a comprehensive testing strategy:

### Test Organization

Tests follow a consistent organization pattern:

```
/src
  /components
    /Button
      Button.tsx
      Button.test.ts        # Unit tests
      Button.stories.tsx    # Storybook stories
      Button.spec.ts        # Integration tests
```

### Component Test Structure

Component tests follow a consistent structure:

```typescript
describe('Button', () => {
  describe('rendering', () => {
    it('renders correctly with default props', () => {
      // Test default rendering
    });
    
    it('applies custom className', () => {
      // Test class application
    });
    
    // Additional rendering tests
  });
  
  describe('behavior', () => {
    it('calls onClick when clicked', async () => {
      // Test click behavior
    });
    
    it('is disabled when isDisabled is true', () => {
      // Test disabled state
    });
    
    // Additional behavior tests
  });
  
  describe('accessibility', () => {
    it('has the correct ARIA attributes', () => {
      // Test accessibility attributes
    });
    
    it('supports keyboard navigation', async () => {
      // Test keyboard interaction
    });
    
    // Additional accessibility tests
  });
});
```

### E2E Test Scenarios

E2E tests cover critical user journeys:

```typescript
// Example of a user journey test
describe('Media Processing User Journey', () => {
  beforeEach(async () => {
    // Setup test data and authenticate
  });
  
  it('allows user to upload and process images', async () => {
    // User navigates to upload page
    await page.goto('/upload');
    
    // User uploads image files
    await page.setInputFiles('input[type="file"]', ['test1.jpg', 'test2.jpg']);
    await page.click('button[type="submit"]');
    
    // User navigates to processing page
    await page.goto('/admin/process');
    
    // User initiates EXIF processing
    await page.click('button[data-testid="process-exif"]');
    
    // Wait for processing to complete
    await page.waitForSelector('[data-testid="processing-complete"]');
    
    // Verify processing results
    const successCount = await page.textContent('[data-testid="success-count"]');
    expect(successCount).toBe('2');
  });
});
```

### Mock Data Strategy

The project uses a consistent mock data strategy:

```typescript
// Factory function for creating test objects
function createTestMediaItem(overrides?: Partial<MediaItem>): MediaItem {
  return {
    id: crypto.randomUUID(),
    fileName: 'test-image.jpg',
    filePath: '/test/path/test-image.jpg',
    fileSize: 1024 * 1024, // 1MB
    type: 'image',
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Create realistic test data sets
function createTestMediaLibrary({
  imageCount = 10,
  videoCount = 5,
} = {}): MediaItem[] {
  return [
    ...Array(imageCount).fill(0).map((_, i) => createTestMediaItem({
      id: `img-${i}`,
      fileName: `image-${i}.jpg`,
    })),
    ...Array(videoCount).fill(0).map((_, i) => createTestMediaItem({
      id: `vid-${i}`,
      fileName: `video-${i}.mp4`,
      type: 'video',
      mimeType: 'video/mp4',
      duration: 120, // 2 minutes
    })),
  ];
}
```

---

This document is a living guide that will continue to evolve alongside the codebase. All developers should refer to both this amendment and the previous standards documents when contributing to the project.
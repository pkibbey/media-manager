# Media Manager - Standards Amendment v3

This document serves as the third amendment to the Media Manager coding standards, building upon the [original standards document](./standards_v1.md) and the [V2 amendment](./standards_v2.md). It reflects the continued evolution of patterns and practices observed in the codebase.

## Table of Contents

1. [Advanced Processing Architecture](#advanced-processing-architecture)
2. [Error Handling and Recovery](#error-handling-and-recovery)
3. [Streaming Optimization Patterns](#streaming-optimization-patterns)
4. [State Management Refinements](#state-management-refinements)
5. [Performance Optimizations](#performance-optimizations)
6. [Component Architecture Patterns](#component-architecture-patterns)
7. [Test-Driven Development](#test-driven-development)
8. [Codebase Documentation](#codebase-documentation)
9. [Advanced TypeScript Patterns](#advanced-typescript-patterns)
10. [Supabase Integration Best Practices](#supabase-integration-best-practices)

## Advanced Processing Architecture

The codebase has further refined its data processing architecture with several advanced patterns:

### Batch Processing with Resilient Recovery

- Processing operations implement resilient batch handling:
  - **Automatic retry** for failed operations with exponential backoff
  - **Partial batch completion** - successful items are committed even when batch fails
  - **Transaction management** - database state remains consistent despite failures

```typescript
// Example pattern for resilient batch processing
async function processBatchWithRetry({
  items,
  processFunc,
  maxRetries = 3,
}: {
  items: MediaItem[];
  processFunc: (item: MediaItem) => Promise<Result>;
  maxRetries?: number;
}): Promise<BatchResult> {
  const results = { success: [], failed: [] };
  
  for (const item of items) {
    let retryCount = 0;
    let success = false;
    
    while (!success && retryCount < maxRetries) {
      try {
        const result = await processFunc(item);
        if (result.success) {
          results.success.push({ item, result });
          success = true;
        } else {
          retryCount++;
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
        }
      } catch (error) {
        retryCount++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
      }
    }
    
    if (!success) {
      results.failed.push(item);
    }
  }
  
  return results;
}
```

### Processing Orchestration

- Complex processing tasks are structured through an orchestration layer:
  - **Priority-based queue** - critical tasks processed first
  - **Resource allocation** - limit parallel processing based on available resources
  - **Processing checkpoints** - enable resume from last successful point
  - **Telemetry integration** - detailed metrics for each processing stage

## Error Handling and Recovery

### Structured Error Categorization

Errors are now categorized with standardized error types:

```typescript
export enum ErrorCategory {
  VALIDATION = 'validation',
  PROCESSING = 'processing',
  NETWORK = 'network',
  DATABASE = 'database',
  AUTHORIZATION = 'authorization',
  CONFIGURATION = 'configuration',
  UNEXPECTED = 'unexpected'
}

export interface StructuredError {
  category: ErrorCategory;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}
```

### Recovery Strategies

- Use dedicated recovery strategies for different error categories:
  - **Self-healing** - operations attempt to fix common issues automatically
  - **Graceful degradation** - fallback to alternative implementations when primary fails
  - **Data salvaging** - extract partial results from failed operations
  - **User-guided recovery** - provide actionable suggestions to users

```typescript
// Example pattern for error handling with recovery
export async function processWithRecovery<T>({
  operation,
  fallback,
  errorHandler,
}: {
  operation: () => Promise<T>;
  fallback?: () => Promise<T>;
  errorHandler?: (error: StructuredError) => Promise<void>;
}): Promise<{ data?: T; error?: StructuredError }> {
  try {
    const data = await operation();
    return { data };
  } catch (rawError) {
    const error = normalizeToStructuredError(rawError);
    
    // Log structured error
    console.error(`${error.category} error: ${error.code}`, error);
    
    // Call error handler if provided
    if (errorHandler) {
      await errorHandler(error);
    }
    
    // Try fallback for retryable errors with fallback defined
    if (error.retryable && fallback) {
      try {
        const data = await fallback();
        return { data, error };
      } catch (fallbackError) {
        // Fallback also failed
        return { error };
      }
    }
    
    return { error };
  }
}
```

## Streaming Optimization Patterns

### Enhanced Stream Processing

Stream processing has been optimized for better performance and reliability:

- **Chunk-based processing** - process data in optimal chunk sizes for memory efficiency
- **Backpressure handling** - ensure producer doesn't overwhelm consumer
- **Stream composability** - chain transform streams for multi-stage processing
- **Reliable cleanup** - guarantee stream resources are released on abort/completion

```typescript
// Example of optimized stream creation with cleanup
export function createOptimizedProcessingStream<T, R>({
  source,
  transformer,
  chunkSize = 50,
  signal,
}: {
  source: AsyncIterable<T>;
  transformer: (items: T[]) => Promise<R[]>;
  chunkSize?: number;
  signal?: AbortSignal;
}): ReadableStream<R> {
  // Implementation details
}
```

### Server-Sent Events Best Practices

The application now follows standardized server-sent event patterns:

- **Event typing** - Use `event:` field for event categorization
- **Structured data** - Always send consistent JSON structures in `data:` field
- **Heartbeat mechanism** - Send periodic keep-alive messages
- **Reconnection logic** - Include event IDs for resumable connections

## State Management Refinements

### Immutable State Updates

State updates use a consistent immutable pattern with enhanced type safety:

```typescript
// Generic state update utility enforcing immutability
function updateState<T>(state: T, update: Partial<T>): T {
  return {
    ...state,
    ...update,
  };
}

// Usage example
const newState = updateState(currentState, { status: 'completed' });
```

### Context Composition Pattern

Context providers follow a composable pattern:

```tsx
// Composition of context providers with dependency ordering
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <AuthProvider>
          <MediaProvider>
            <ProcessingProvider>
              {children}
            </ProcessingProvider>
          </MediaProvider>
        </AuthProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}
```

### Hook Enhancement Patterns

Hooks follow these enhancement patterns:

- **Progressive disclosure** - Basic API exposed by default with options for advanced usage
- **Memoization optimization** - Consistent use of useMemo/useCallback with dependency arrays
- **Effect cleanup** - All effects return cleanup functions
- **State change tracking** - Dedicated refs track previous state values

```typescript
// Example of progressive disclosure in hook API
function useDataFetching<T>(url: string, options?: DataFetchOptions) {
  // Basic implementation
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Advanced options with defaults
  const {
    refetchInterval = 0,
    dedupingInterval = 2000,
    revalidateOnFocus = true,
    cacheTime = 5 * 60 * 1000,
  } = options || {};
  
  // Implementation details...
  
  // Return basic API by default
  const result = { data, loading, error, refetch };
  
  // Only expose advanced API when options are used
  if (options) {
    return {
      ...result,
      mutate,
      isValidating,
      isStale,
    };
  }
  
  return result;
}
```

## Performance Optimizations

### Virtualization Patterns

- List virtualization is standardized for all large data sets:
  - Use `react-virtual` for list/grid virtualization
  - Implement height estimation for variable-height items
  - Apply pagination in combination with virtualization for very large datasets

```tsx
// Standard list virtualization pattern
function VirtualizedMediaList({ items }: { items: MediaItem[] }) {
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <MediaItem item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Memory Management

- Implement consistent memory management patterns:
  - Cache invalidation strategies based on access frequency
  - Memory usage monitoring with adaptive throttling
  - Cleanup of large objects when components unmount
  - Use of WeakRef/FinalizationRegistry for expensive resources

### Resource Loading Optimizations

- Standardize resource loading strategies:
  - Use dynamic imports for code splitting
  - Implement preloading for anticipated user paths
  - Apply progressive loading for media assets
  - Define critical rendering path optimization

## Component Architecture Patterns

### Atomic Design Implementation

The component hierarchy now follows atomic design principles:

1. **Atoms**: Basic UI elements (Button, Input, etc.)
2. **Molecules**: Simple component combinations (SearchField, MediaCard, etc.)
3. **Organisms**: Complex UI sections (MediaGrid, ProcessorPanel, etc.)
4. **Templates**: Page layouts with placeholder content
5. **Pages**: Complete views with real data

### Smart/Presentation Component Separation

Components are clearly separated into two types:

1. **Smart Components**:
   - Handle data fetching and state management
   - Connect to context providers
   - Located in feature directories

2. **Presentation Components**:
   - Accept data via props
   - Emit events via callbacks
   - Located in UI component directories

### Prop Interface Standards

Props follow a consistent interface pattern:

```typescript
// Base component props interface
interface BaseProps {
  className?: string;
  id?: string;
  "data-testid"?: string;
}

// Component-specific props extend base props
interface ButtonProps extends BaseProps {
  variant?: 'default' | 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}
```

## Test-Driven Development

### Testing Strategy

Implement a comprehensive testing strategy:

- **Unit Tests**: Test individual functions and hooks
- **Component Tests**: Test component rendering and interactions
- **Integration Tests**: Test component combinations and context usage
- **E2E Tests**: Test complete user flows

### Test File Organization

```
/src
  /components
    /Button
      Button.tsx
      Button.test.tsx
      Button.stories.tsx
```

### Mock Strategies

- Implement consistent mocking patterns:
  - Mock services at module boundaries
  - Use MSW for API mocking
  - Provide test-specific context providers

## Codebase Documentation

### JSDoc Standards

All public APIs include complete JSDoc documentation:

```typescript
/**
 * Processes media items in batches with progress reporting.
 * 
 * @param options - Configuration options
 * @param options.mediaIds - Array of media IDs to process
 * @param options.batchSize - Number of items to process in each batch
 * @param options.processType - Type of processing to perform
 * @param options.onProgress - Optional callback for progress updates
 * 
 * @returns A promise resolving to processing results
 * 
 * @throws {ValidationError} When provided with invalid parameters
 * @throws {ProcessingError} When processing fails
 * 
 * @example
 * ```typescript
 * const results = await processMediaBatch({
 *   mediaIds: ['id1', 'id2'],
 *   batchSize: 10,
 *   processType: 'thumbnail'
 * });
 * ```
 */
export async function processMediaBatch({
  mediaIds,
  batchSize,
  processType,
  onProgress,
}: ProcessBatchOptions): Promise<ProcessingResults> {
  // Implementation
}
```

### Component Documentation

- All components include documentation for:
  - Component purpose
  - Prop descriptions with examples
  - Usage examples
  - Performance considerations
  - Accessibility notes

## Advanced TypeScript Patterns

### Discriminated Union Types

Use discriminated unions for state modeling:

```typescript
type ProcessingState = 
  | { status: 'idle' }
  | { status: 'loading'; progress: number }
  | { status: 'success'; result: ProcessingResult }
  | { status: 'error'; error: StructuredError };
```

### Utility Types

Leverage TypeScript utility types for consistency:

```typescript
// Extract component props from React component
type ButtonProps = React.ComponentProps<typeof Button>;

// Make certain properties required
type RequiredConfig = Required<Pick<Config, 'apiKey' | 'endpoint'>>;

// Create a subset of properties that are optional
type OptionalMediaItem = Partial<MediaItem>;
```

### Advanced Type Guards

Use type guards for runtime type safety:

```typescript
function isErrorState(state: ProcessingState): state is { status: 'error'; error: StructuredError } {
  return state.status === 'error';
}

// Usage
if (isErrorState(currentState)) {
  // Access error property safely
  handleError(currentState.error);
}
```

## Supabase Integration Best Practices

### Database Access Patterns

- Standard patterns for database access:
  - Use RPC functions for complex operations
  - Implement row-level security for all tables
  - Use database policies for access control
  - Leverage Postgres functions for heavy calculations

### Data Syncing Patterns

- Implement consistent data synchronization:
  - Optimistic UI updates with fallback
  - Realtime subscription for collaborative features
  - Batched write operations
  - Conflict resolution strategies

### Storage Best Practices

- Standard patterns for storage operations:
  - Implement content-type validation before upload
  - Use storage policies for access control
  - Implement resumable uploads for large files
  - Apply consistent metadata for stored assets

---

This document should be used in conjunction with the [original standards](./standards.md) and [V2 amendment](./standards_v2.md). As the codebase continues to evolve, these standards will be updated to reflect emerging patterns and best practices.
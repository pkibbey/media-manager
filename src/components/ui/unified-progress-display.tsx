'use client';

import { CheckIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import type { UnifiedProgress } from '@/types/progress-types';
import { ProcessingTimeEstimator } from '../admin/processing-time-estimator';
import { Progress } from './progress';

export interface UnifiedProgressDisplayProps {
  /**
   * Whether the process is currently running
   */
  isProcessing: boolean;

  /**
   * Progress data for the current process
   */
  progress: UnifiedProgress | null;

  /**
   * Timestamp when processing started (for time estimation)
   */
  processingStartTime?: number;

  /**
   * Custom title for the progress display
   */
  title?: string;

  /**
   * Text to display when showing processed/total counts
   */
  itemsLabel?: string;

  /**
   * Unit for processing rate display
   */
  rateUnit?: string;

  /**
   * Hide metadata display (file types, etc.)
   */
  hideMetadata?: boolean;

  /**
   * Hide success message when process completes
   */
  hideSuccessMessage?: boolean;

  /**
   * Additional className for the container
   */
  className?: string;
}

/**
 * A standardized progress display component that works with the UnifiedProgress type
 * Handles showing progress bars, completion percentages, success/error counts,
 * time estimation, and success/error states.
 */
export function UnifiedProgressDisplay({
  isProcessing,
  progress,
  processingStartTime,
  title,
  itemsLabel = 'files',
  rateUnit = 'items/sec',
  hideMetadata = false,
  hideSuccessMessage = false,
  className,
}: UnifiedProgressDisplayProps) {
  // Don't show anything if there's no processing happening or completed
  if (!progress) return null;

  const showProgress = isProcessing || progress.processedCount;
  if (!showProgress) return null;

  // Calculate counts for display
  const totalCount = progress.totalCount || 0;
  const processedCount = progress.processedCount || 0;
  const successCount = progress.successCount || 0;
  const failureCount = progress.failureCount || 0;
  const percentComplete = progress.percentComplete || 0;

  // Determine component state
  const isComplete = progress.status === 'success' && !isProcessing;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with title and counts */}
      {title && (
        <div className="flex justify-between items-center gap-4 overflow-hidden">
          <h3 className="text-lg font-medium truncate">{title}</h3>
          <span className="shrink-0">
            {processedCount} / {totalCount} {itemsLabel}
          </span>
        </div>
      )}

      {/* Progress message */}
      <div className="flex justify-between text-sm gap-4">
        <span className="truncate">{progress.message}</span>
        {!title && (
          <span className="shrink-0">
            {processedCount} / {totalCount} {itemsLabel}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <Progress value={percentComplete} className="h-2" />

      {/* Statistics row */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Success: {successCount}</span>
          {failureCount > 0 && (
            <span className="text-destructive">Failed: {failureCount}</span>
          )}
        </div>
        <span>{percentComplete.toFixed(1)}%</span>
      </div>

      {/* Time estimation */}
      {isProcessing && (
        <ProcessingTimeEstimator
          isProcessing={isProcessing}
          progress={progress}
          startTime={processingStartTime}
          rateUnit={rateUnit}
        />
      )}

      {/* Metadata display (e.g., current file type) */}
      {!hideMetadata && progress.metadata && (
        <div className="text-xs text-muted-foreground truncate flex justify-between gap-4">
          {progress.metadata.processingType && (
            <span>{progress.metadata.processingType}</span>
          )}
          {progress.metadata.fileType && (
            <span className="px-2 py-1 bg-secondary rounded-md">
              {progress.metadata.fileType}
            </span>
          )}
        </div>
      )}

      {/* Success message */}
      {isComplete && !hideSuccessMessage && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-sm">
          <CheckIcon className="h-4 w-4 text-primary" />
          <span>
            Successfully processed {successCount} {itemsLabel}
            {failureCount > 0 && ` (${failureCount} failed)`}
          </span>
        </div>
      )}
    </div>
  );
}

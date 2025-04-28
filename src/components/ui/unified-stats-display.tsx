'use client';

import { InfoCircledIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import type { UnifiedStats } from '@/types/unified-stats';
import { Progress } from './progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

interface UnifiedStatsDisplayProps {
  /**
   * The stats data to display
   */
  stats: UnifiedStats;

  /**
   * The title to display at the top of the component
   */
  title: string;

  /**
   * Description text shown at the bottom of the component
   */
  description: string;

  /**
   * Custom labels for different metrics, override defaults
   */
  labels?: {
    /**
     * Label for items with successful processing
     * @default "files with data"
     */
    success?: string;

    /**
     * Label for items that failed processing
     * @default "files processed but no data found"
     */
    failed?: string;
  };

  /**
   * Additional info tooltip content
   */
  tooltipContent?: React.ReactNode;

  /**
   * Message to show when no files are found
   */
  noFilesMessage?: React.ReactNode;

  /**
   * Message to show when all files are processed but some are unprocessable
   */
  allProcessedMessage?: React.ReactNode;

  /**
   * Additional class name for the container
   */
  className?: string;
}

/**
 * A standardized component to display statistics according to the UnifiedStats type
 * Can be used for different types of processing stats (EXIF, thumbnails, etc.)
 */
export function UnifiedStatsDisplay({
  stats,
  title,
  description,
  labels = {},
  tooltipContent,
  noFilesMessage,
  allProcessedMessage,
  className,
}: UnifiedStatsDisplayProps) {
  // Calculate progress percentage
  const progressValue = stats?.counts?.total ? 
    Math.round((stats.counts.success * 100) / stats.counts.total) : 0;

  // Calculate total processed files
  const totalProcessed = stats
    ? (stats.counts.success || 0) + (stats.counts.failed || 0)
    : 0;

  // Calculate waiting files
  const totalWaiting = stats ? stats.counts.total - totalProcessed : 0;

  // Default labels
  const defaultLabels = {
    success: 'files with data',
    failed: 'files processed but no data found',
    pending: 'files waiting to be processed',
  };

  // Merge default labels with provided labels
  const mergedLabels = { ...defaultLabels, ...labels };

  // Determine if we should show the no files message or all processed message
  const showNoFilesMessage =
    stats && stats.counts.total === 0 && noFilesMessage;
  const showAllProcessedMessage =
    stats &&
    totalWaiting === 0 &&
    totalProcessed < (stats.counts.total || 0) &&
    allProcessedMessage;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with title and progress count */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="text-sm text-muted-foreground">
          {totalProcessed}
          {' / '}
          {stats?.counts.total || 0} files
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={progressValue} className="h-2" />

      {/* Stats details */}
      <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>
            {stats?.counts.success || 0} {mergedLabels.success}
          </span>

          <span>
            {stats?.counts.failed || 0} {mergedLabels.failed}
          </span>
        </div>

        <div className="flex justify-between">
          <span>
            {totalWaiting} {mergedLabels.pending}
          </span>

          {/* Info tooltip */}
          {tooltipContent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center underline-offset-4 text-xs hover:underline">
                    <InfoCircledIcon className="h-3 w-3 mr-1" /> Processing info
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-[300px]">
                  {tooltipContent}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Description and conditional messages */}
      <div className="text-sm text-muted-foreground">
        {description}

        {showNoFilesMessage && (
          <span className="block mt-2 text-amber-600 dark:text-amber-500">
            {noFilesMessage}
          </span>
        )}

        {showAllProcessedMessage && (
          <span className="block mt-1 text-amber-600 dark:text-amber-500">
            {allProcessedMessage}
          </span>
        )}

        {/* Show error message if present */}
        {stats?.error && (
          <span className="block mt-2 text-destructive">
            Error: {stats.error}
          </span>
        )}

        {/* Show status message if present */}
        {stats?.message && stats.status !== 'error' && (
          <span className="block mt-2 text-info">
            {stats.message}
          </span>
        )}
      </div>
    </div>
  );
}

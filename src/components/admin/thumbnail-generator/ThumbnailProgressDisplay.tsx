import { Progress } from '@/components/ui/progress';
import type { UnifiedProgress } from '@/types/progress-types';
import { ProcessingTimeEstimator } from '../processing-time-estimator';

type ThumbnailProgressDisplayProps = {
  isProcessingAll: boolean;
  progress: number;
  processed: number;
  total: number;
  batchSize: number;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  detailProgress: UnifiedProgress | null;
  processingStartTime?: number;
  hasError: boolean;
};

export function ThumbnailProgressDisplay({
  isProcessingAll,
  progress,
  processed,
  total,
  batchSize,
  totalProcessed,
  successCount,
  failedCount,
  detailProgress,
  processingStartTime,
  hasError,
}: ThumbnailProgressDisplayProps) {
  // Make sure we have valid values for display
  const displayTotal = total || batchSize;
  const displayProgress =
    progress || Math.round((processed / Math.max(displayTotal, 1)) * 100);

  return (
    <div className="flex flex-col overflow-hidden gap-4 space-y-4">
      <div className="flex justify-between items-center gap-4 overflow-hidden">
        <h2 className="text-lg font-medium truncate">
          Thumbnail Generator : Processing
        </h2>
        <span className="shrink-0">
          {successCount} /{' '}
          {batchSize === Number.POSITIVE_INFINITY ? total : batchSize} files
          {isProcessingAll &&
            totalProcessed > 0 &&
            ` (${totalProcessed} total)`}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <Progress value={displayProgress} className="h-2" />
        <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-2 truncate">
              <span>Success: {successCount}</span>
              <span>Failed: {failedCount}</span>
            </span>
            <span>{displayProgress}%</span>
          </div>

          <ProcessingTimeEstimator
            isProcessing
            processed={processed}
            remaining={displayTotal - processed}
            startTime={processingStartTime}
            rateUnit="thumbnails/sec"
          />

          <div className="text-xs text-muted-foreground truncate mt-1 flex justify-between gap-4">
            <span className="truncate">{detailProgress?.message}</span>
            {detailProgress?.metadata?.fileType && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-secondary">
                {detailProgress.metadata.fileType}
              </span>
            )}
          </div>
        </div>
      </div>

      {hasError && (
        <div className="text-sm text-destructive mt-2">
          Some errors occurred during processing. See details below.
        </div>
      )}
    </div>
  );
}

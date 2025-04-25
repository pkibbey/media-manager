import { Progress } from '@/components/ui/progress';
import type { UnifiedProgress } from '@/types/progress-types';
import { ProcessingTimeEstimator } from '../processing-time-estimator';

type ExifProgressDisplayProps = {
  isProcessing: boolean;
  progress: UnifiedProgress | null;
  processingStartTime?: number;
  hasError: boolean;
};

export function ExifProgressDisplay({
  isProcessing,
  progress,
  processingStartTime,
  hasError,
}: ExifProgressDisplayProps) {
  if (!isProcessing) return null;

  return (
    <div className="overflow-hidden space-y-2">
      <div className="flex justify-between text-sm gap-4">
        <span className="truncate">{progress?.message}</span>
        <span className="shrink-0">
          {progress?.processedCount || 0} / {progress?.totalCount || 0} files
        </span>
      </div>
      <Progress value={progress?.percentComplete} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Success: {progress?.successCount || 0}</span>
        <span>Failed: {progress?.failedCount || 0}</span>
        <span>{progress?.percentComplete?.toFixed(1)}%</span>
      </div>

      <ProcessingTimeEstimator
        isProcessing={isProcessing}
        processed={progress?.processedCount || 0}
        remaining={
          (progress?.totalCount || 0) - (progress?.processedCount || 0)
        }
        startTime={processingStartTime}
        label="Est. time remaining"
        rateUnit="files/sec"
      />

      {hasError && (
        <div className="text-sm text-destructive mt-2">
          An error occurred during processing. Check the console for details.
        </div>
      )}
    </div>
  );
}

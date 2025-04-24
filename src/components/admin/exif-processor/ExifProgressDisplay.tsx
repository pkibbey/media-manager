import { Progress } from '@/components/ui/progress';
import type { ExifProgress } from '@/types/exif';
import { ProcessingTimeEstimator } from '../processing-time-estimator';

type ExifProgressDisplayProps = {
  isStreaming: boolean;
  progress: ExifProgress | null;
  streamingProgressPercentage: number;
  processingStartTime?: number;
  hasError: boolean;
};

export function ExifProgressDisplay({
  isStreaming,
  progress,
  streamingProgressPercentage,
  processingStartTime,
  hasError,
}: ExifProgressDisplayProps) {
  if (!isStreaming) return null;

  return (
    <div className="overflow-hidden space-y-2">
      <div className="flex justify-between text-sm gap-4">
        <span className="truncate">{progress?.message}</span>
        <span className="shrink-0">
          {progress?.filesProcessed || 0} / {progress?.filesDiscovered || 0}{' '}
          files
        </span>
      </div>
      <Progress value={streamingProgressPercentage} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Success: {progress?.successCount || 0}</span>
        <span>Failed: {progress?.failedCount || 0}</span>
        <span>{streamingProgressPercentage.toFixed(1)}%</span>
      </div>

      <ProcessingTimeEstimator
        isProcessing={isStreaming}
        processed={progress?.filesProcessed || 0}
        remaining={
          (progress?.filesDiscovered || 0) - (progress?.filesProcessed || 0)
        }
        startTime={processingStartTime}
        label="Est. time remaining"
        rateUnit="files/sec"
      />

      <div className="text-xs text-muted-foreground">
        Skipped {progress?.largeFilesSkipped || 0} large files (over 100MB)
      </div>
      <div className="text-xs text-muted-foreground truncate">
        Current file: {progress?.currentFilePath}
      </div>

      {hasError && (
        <div className="text-sm text-destructive mt-2">
          An error occurred during processing. Check the console for details.
        </div>
      )}
    </div>
  );
}

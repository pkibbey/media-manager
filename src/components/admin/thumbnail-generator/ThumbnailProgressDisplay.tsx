import { Progress } from '@/components/ui/progress';
import { LARGE_FILE_THRESHOLD } from '@/lib/consts';
import { ProcessingTimeEstimator } from '../processing-time-estimator';

type ThumbnailProgress = {
  status: 'processing' | 'completed' | 'error';
  message: string;
  currentFilePath?: string;
  fileType?: string;
  error?: string;
};

type ThumbnailProgressDisplayProps = {
  isProcessingAll: boolean;
  progress: number;
  processed: number;
  total: number;
  batchSize: number;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  largeFilesSkipped: number;
  detailProgress: ThumbnailProgress | null;
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
  largeFilesSkipped,
  detailProgress,
  processingStartTime,
  hasError,
}: ThumbnailProgressDisplayProps) {
  return (
    <div className="grid overflow-hidden gap-4 space-y-4">
      <div className="flex justify-between items-center gap-4 overflow-hidden">
        <h2 className="text-lg font-medium truncate">
          {detailProgress?.message}
        </h2>
        <span className="shrink-0">
          {processed} / {Math.min(batchSize, total)} files
          {isProcessingAll &&
            totalProcessed > 0 &&
            ` (${totalProcessed} total)`}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
        <div className="flex justify-between text-xs">
          <span>Success: {successCount}</span>
          <span>Failed: {failedCount}</span>
          <span>{progress}%</span>
        </div>

        <ProcessingTimeEstimator
          isProcessing
          processed={processed}
          remaining={Math.min(batchSize, total) - processed}
          startTime={processingStartTime}
          rateUnit="thumbnails/sec"
        />

        {largeFilesSkipped > 0 && (
          <div className="text-xs text-muted-foreground">
            {`Skipped ${largeFilesSkipped} large files (over ${Math.round(
              LARGE_FILE_THRESHOLD / 1024 / 1024,
            )}MB)`}
          </div>
        )}
        <div className="text-xs text-muted-foreground truncate mt-1 flex justify-between">
          <span>Current file: {detailProgress?.currentFilePath || '_'}</span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-secondary">
            .{detailProgress?.fileType || '??'}
          </span>
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

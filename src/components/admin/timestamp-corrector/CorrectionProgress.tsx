import { CheckIcon } from '@radix-ui/react-icons';
import { Progress } from '@/components/ui/progress';
import { ProcessingTimeEstimator } from '../processing-time-estimator';
import type { UnifiedProgress } from '@/types/progress-types';

type CorrectionProgressProps = {
  isProcessing: boolean;
  progress: UnifiedProgress | null;
  processingStartTime?: number;
};

export function CorrectionProgress({
  isProcessing,
  progress,
  processingStartTime,
}: CorrectionProgressProps) {
  // Don't show anything if there's no processing happening or completed
  if (!isProcessing && (!progress || progress.processedCount === 0)) {
    return null;
  }

  return (
    <>
      {isProcessing && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm gap-4">
            <span className="truncate">
              {progress?.message || 'Processing timestamp correction...'}
            </span>
          </div>
          <Progress value={progress?.percentComplete || 0} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Processing...</span>
            <span>
              Updated {progress?.successCount || 0} of{' '}
              {progress?.processedCount || 0} files
            </span>
          </div>
          <ProcessingTimeEstimator
            isProcessing={isProcessing}
            processed={progress?.processedCount || 0}
            remaining={
              progress?.processedCount && progress?.percentComplete
                ? Math.round(
                    progress.processedCount / (progress.percentComplete / 100) -
                      progress.processedCount,
                  )
                : 0
            }
            startTime={processingStartTime}
            label="Est. time remaining"
            rateUnit="files/sec"
          />
        </div>
      )}

      {progress?.status === 'success' && !isProcessing && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-sm">
          <CheckIcon className="h-4 w-4 text-primary" />
          <span>
            Updated timestamps for {progress.successCount || 0} out of{' '}
            {progress.processedCount || 0} files
          </span>
        </div>
      )}
    </>
  );
}

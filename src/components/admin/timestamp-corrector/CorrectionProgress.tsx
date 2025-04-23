import { CheckIcon } from '@radix-ui/react-icons';
import { Progress } from '@/components/ui/progress';
import { ProcessingTimeEstimator } from '../processing-time-estimator';
import type { CorrectionProgress as ProgressType } from './useTimestampCorrection';

type CorrectionProgressProps = {
  isProcessing: boolean;
  progress: ProgressType;
  processingStartTime?: number;
};

export function CorrectionProgress({
  isProcessing,
  progress,
  processingStartTime,
}: CorrectionProgressProps) {
  if (!isProcessing && progress.processed === 0) {
    return null;
  }

  return (
    <>
      {isProcessing && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm gap-4">
            <span className="truncate">Processing timestamp correction...</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Processing...</span>
            <span>
              Updated {progress.updated} of {progress.processed} files
            </span>
          </div>
          <ProcessingTimeEstimator
            isProcessing={isProcessing}
            processed={progress.processed}
            remaining={
              progress.processed > 0
                ? Math.round(
                    progress.processed / (progress.percent / 100) -
                      progress.processed,
                  )
                : 0
            }
            startTime={processingStartTime}
            label="Est. time remaining"
            rateUnit="files/sec"
          />
        </div>
      )}

      {progress.processed > 0 && !isProcessing && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-sm">
          <CheckIcon className="h-4 w-4 text-primary" />
          <span>
            Updated timestamps for {progress.updated} out of{' '}
            {progress.processed} files
          </span>
        </div>
      )}
    </>
  );
}

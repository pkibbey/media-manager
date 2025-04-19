'use client';

import { updateMediaDatesFromFilenames } from '@/app/actions/exif';
import { getMediaStats } from '@/app/actions/stats';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CalendarIcon,
  CheckIcon,
  RotateCounterClockwiseIcon,
} from '@radix-ui/react-icons';
import { useState } from 'react';
import { toast } from 'sonner';
import { ProcessingTimeEstimator } from './processing-time-estimator';

export type TimestampCorrectorProps = {
  initialNeedsCorrection?: number;
};

export default function TimestampCorrectorClient({
  initialNeedsCorrection = 0,
}: TimestampCorrectorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({
    processed: 0,
    updated: 0,
    percent: 0,
  });
  const [processingStartTime, setProcessingStartTime] = useState<
    number | undefined
  >(undefined);
  const [needsCorrection, setNeedsCorrection] = useState(
    initialNeedsCorrection,
  );

  const handleUpdateTimestamps = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setProgress({ processed: 0, updated: 0, percent: 0 });
    setProcessingStartTime(Date.now());

    try {
      const result = await updateMediaDatesFromFilenames({
        itemCount: 500,
        updateAll: false,
      });

      if (result.success) {
        const percent =
          result.processed > 0
            ? Math.round((result.updated / result.processed) * 100)
            : 0;

        setProgress({
          processed: result.processed,
          updated: result.updated,
          percent,
        });

        toast.success(`Updated ${result.updated} timestamps successfully`);

        // Refresh stats after processing
        const { success, data } = await getMediaStats();
        if (success && data) {
          setNeedsCorrection(data.needsTimestampCorrectionCount || 0);
        }
      } else {
        console.error(
          'TimestampCorrector',
          result.error || 'Failed to update timestamps',
        );
        toast.error('Failed to update timestamps');
      }
    } catch (error) {
      console.error('Error updating timestamps:', error);
      toast.error('Error occurred while updating timestamps');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* The stats are now rendered by the parent component */}

      {/* Progress and status - only shown during or after processing */}
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

      {/* Action button */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleUpdateTimestamps}
          disabled={isProcessing || needsCorrection === 0}
          variant="default"
          className="w-full"
        >
          {isProcessing ? (
            <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CalendarIcon className="mr-2 h-4 w-4" />
          )}
          {isProcessing
            ? 'Processing...'
            : needsCorrection === 0
              ? 'No Files Need Correction'
              : 'Correct Timestamps'}
        </Button>
      </div>
    </>
  );
}

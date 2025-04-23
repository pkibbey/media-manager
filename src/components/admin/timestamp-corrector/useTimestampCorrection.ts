import { useState } from 'react';
import { toast } from 'sonner';
import { updateMediaDatesFromFilenames } from '@/app/actions/exif';
import { getMediaStats } from '@/app/actions/stats';

export type CorrectionProgress = {
  processed: number;
  updated: number;
  percent: number;
};

export function useTimestampCorrection(initialNeedsCorrection = 0) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<CorrectionProgress>({
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

  const handleStopProcessing = () => {
    if (isProcessing) {
      setIsProcessing(false);
    }
  };

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

  return {
    isProcessing,
    progress,
    processingStartTime,
    needsCorrection,
    handleStopProcessing,
    handleUpdateTimestamps,
  };
}

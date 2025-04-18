'use client';

import { updateMediaDatesFromFilenames } from '@/app/actions/exif';
import { getMediaStats } from '@/app/actions/stats';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { MediaStats } from '@/types/media-types';
import {
  CalendarIcon,
  CheckIcon,
  InfoCircledIcon,
  RotateCounterClockwiseIcon,
} from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProcessingTimeEstimator } from './processing-time-estimator';

export default function TimestampCorrector() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState({
    processed: 0,
    updated: 0,
    percent: 0,
  });
  const [processingStartTime, setProcessingStartTime] = useState<
    number | undefined
  >(undefined);
  const [stats, setStats] = useState<MediaStats | null>(null);

  // Load stats on component mount and after processing
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching timestamp correction stats...');
      const { success, data, error } = await getMediaStats();

      if (success && data) {
        console.log('Stats loaded successfully:', {
          totalItems: data.totalMediaItems,
          needsCorrection: data.needsTimestampCorrectionCount,
        });
        setStats(data);
      } else {
        console.error('Failed to load timestamp stats:', error);
        toast.error('Failed to load timestamp correction data');
      }
    } catch (error) {
      console.error('Error fetching timestamp stats:', error);
      toast.error('Error loading timestamp correction data');
    } finally {
      setIsLoading(false);
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
        await fetchStats();
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

  // Calculate the percentage of files that don't need timestamp correction
  const correctedPercentage =
    stats?.totalMediaItems && stats.totalMediaItems > 0
      ? ((stats.totalMediaItems - (stats.needsTimestampCorrectionCount ?? 0)) /
          stats.totalMediaItems) *
        100
      : 0;

  return (
    <div className="overflow-hidden space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">Timestamp Correction</h2>
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            'Loading stats...'
          ) : stats?.needsTimestampCorrectionCount !== undefined ? (
            <>
              {stats.totalMediaItems -
                (stats.needsTimestampCorrectionCount ?? 0)}{' '}
              / {stats.totalMediaItems} files corrected
            </>
          ) : (
            'No data available'
          )}
        </div>
      </div>

      {/* Always display progress bar with loading state if needed */}
      <Progress
        value={isLoading ? undefined : correctedPercentage}
        className="h-2"
      />

      <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>
            {isLoading
              ? 'Loading...'
              : `${stats?.needsTimestampCorrectionCount ?? 0} files need timestamp correction`}
          </span>
          <span>
            {isLoading
              ? 'Loading...'
              : `${
                  stats?.totalMediaItems
                    ? stats.totalMediaItems -
                      (stats.needsTimestampCorrectionCount ?? 0)
                    : 0
                } files with correct timestamps`}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Only processed, EXIF-capable files are eligible</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center underline-offset-4 text-xs hover:underline">
                  <InfoCircledIcon className="h-3 w-3 mr-1" /> Correction info
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[300px]">
                Timestamp correction attempts to extract date information from
                filenames when EXIF data is missing. This helps organize media
                chronologically.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Fix missing or incorrect timestamps by extracting date information from
        filenames.
      </p>

      {/* Progress and status */}
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

      {/* Single action button, matching other tabs */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleUpdateTimestamps}
          disabled={
            isProcessing ||
            isLoading ||
            stats?.needsTimestampCorrectionCount === 0
          }
          variant="default"
          className="w-full"
        >
          {isProcessing ? (
            <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
          ) : isLoading ? (
            <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CalendarIcon className="mr-2 h-4 w-4" />
          )}
          {isProcessing
            ? 'Processing...'
            : isLoading
              ? 'Loading...'
              : stats?.needsTimestampCorrectionCount === 0
                ? 'No Files Need Correction'
                : 'Correct Timestamps'}
        </Button>
      </div>
    </div>
  );
}

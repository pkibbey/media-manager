'use client';

import { updateMediaDatesFromFilenames } from '@/app/api/actions/exif';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  RotateCounterClockwiseIcon,
} from '@radix-ui/react-icons';
import { useState } from 'react';

export default function TimestampCorrector() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processAll, setProcessAll] = useState(false);
  const [progress, setProgress] = useState({
    processed: 0,
    updated: 0,
    percent: 0,
  });

  const handleUpdateTimestamps = async (itemCount: number) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setProgress({ processed: 0, updated: 0, percent: 0 });

    try {
      const result = await updateMediaDatesFromFilenames(itemCount, processAll);

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

        console.log(result.message || 'Timestamps updated successfully');
      } else {
        console.error(result.error || 'Failed to update timestamps');
      }
    } catch (error) {
      console.error('Error updating timestamps:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">Timestamp Correction</h3>
          <p className="text-sm text-muted-foreground">
            Fix missing or incorrect timestamps by extracting date information
            from filenames.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 border rounded-md">
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            This tool analyzes filenames to extract date information and updates
            media timestamps. Useful for files with missing or incorrect EXIF
            timestamps.
          </p>

          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <input
              type="checkbox"
              id="processAll"
              checked={processAll}
              onChange={(e) => setProcessAll(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="processAll" className="text-sm cursor-pointer">
              Process all files (not just those with missing dates)
            </label>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress.percent} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing...</span>
                <span>
                  Updated {progress.updated} of {progress.processed} files
                </span>
              </div>
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

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => handleUpdateTimestamps(50)}
              disabled={isProcessing}
              variant="outline"
              className="flex-1"
            >
              {isProcessing ? (
                <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ClockIcon className="mr-2 h-4 w-4" />
              )}
              Process 50 Files
            </Button>

            <Button
              onClick={() => handleUpdateTimestamps(200)}
              disabled={isProcessing}
              variant="outline"
              className="flex-1"
            >
              {isProcessing ? (
                <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ClockIcon className="mr-2 h-4 w-4" />
              )}
              Process 200 Files
            </Button>

            <Button
              onClick={() => handleUpdateTimestamps(500)}
              disabled={isProcessing}
              variant="default"
              className="flex-1"
            >
              {isProcessing ? (
                <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarIcon className="mr-2 h-4 w-4" />
              )}
              Process 500 Files
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

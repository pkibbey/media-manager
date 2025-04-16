'use client';

import { processAllUnprocessedItems } from '@/app/api/actions/exif';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RotateCounterClockwiseIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

export default function ExifProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({
    processed: 0,
    total: 0,
    percent: 0,
  });
  const [statusMessage, setStatusMessage] = useState('');

  const handleProcessBatch = async (batchSize: number) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setProgress({ processed: 0, total: 0, percent: 0 });
    setStatusMessage(`Starting to process ${batchSize} items...`);

    try {
      // First, set an estimate of the total to give immediate feedback
      setProgress({ processed: 0, total: batchSize, percent: 0 });

      const result = await processAllUnprocessedItems(batchSize);

      if (result.success) {
        // Make sure we're using the correct values from the result
        const processedCount = result.processed;
        const totalCount = result.total;

        // Calculate percentage correctly
        const percentComplete = totalCount
          ? Math.round((processedCount / totalCount) * 100)
          : 100;

        setProgress({
          processed: processedCount,
          total: totalCount,
          percent: percentComplete,
        });

        setStatusMessage(
          result.message ||
            `Processed ${processedCount} of ${totalCount} items.`,
        );

        // Log for debugging
        console.log('Processing complete:', {
          processed: processedCount,
          total: totalCount,
          percent: percentComplete,
        });
      } else {
        setStatusMessage(result.message || 'Processing failed');
        console.error(result.message || 'Processing failed');
      }
    } catch (error) {
      setStatusMessage('Error processing batch');
      console.error('Error processing batch:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">EXIF Data Processing</h3>
          <p className="text-sm text-muted-foreground">
            Extract exifData from images and videos to enhance organization
            capabilities.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 border rounded-md">
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Process unprocessed media items to extract EXIF data, such as camera
            details, date taken, and GPS coordinates.
          </p>

          <div className="space-y-2">
            <Progress value={progress.percent} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {isProcessing
                ? `Processing... ${progress.processed} of ${progress.total} items`
                : progress.processed > 0
                  ? statusMessage
                  : 'No items processed yet'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => handleProcessBatch(25)}
              disabled={isProcessing}
              variant="outline"
              className="flex-1"
            >
              {isProcessing ? (
                <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Process 25 Items
            </Button>

            <Button
              onClick={() => handleProcessBatch(100)}
              disabled={isProcessing}
              variant="outline"
              className="flex-1"
            >
              {isProcessing ? (
                <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Process 100 Items
            </Button>

            <Button
              onClick={() => handleProcessBatch(500)}
              disabled={isProcessing}
              variant="default"
              className="flex-1"
            >
              {isProcessing ? (
                <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Process 500 Items
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

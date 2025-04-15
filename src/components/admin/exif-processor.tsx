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

  const handleProcessBatch = async (batchSize: number) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setProgress({ processed: 0, total: 0, percent: 0 });

    try {
      const result = await processAllUnprocessedItems(batchSize);

      if (result.success) {
        setProgress({
          processed: result.processed || 0,
          total: result.total || 0,
          percent: result.total
            ? Math.round(((result.processed || 0) / result.total) * 100)
            : 100,
        });

        console.log(result.message || 'Processing complete');
      } else {
        console.error(result.message || 'Processing failed');
      }
    } catch (error) {
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
            Extract metadata from images and videos to enhance organization
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

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress.percent} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                Processed {progress.processed} of {progress.total} items
              </p>
            </div>
          )}

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

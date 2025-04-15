'use client';

import { processAllUnprocessedItems } from '@/app/api/actions/exif';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

export default function ExifProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    processed: 0,
    failed: 0,
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleProcessItems = async () => {
    try {
      setIsProcessing(true);
      setProgress({ total: 0, processed: 0, failed: 0 });
      setErrors([]);

      const result = await processAllUnprocessedItems(50); // Process 50 items at a time
      console.log('result: ', result);
    } catch (error: any) {
      console.log('Error processing items:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate completion percentage
  const completionPercentage =
    progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>EXIF Data Processing</CardTitle>
        <CardDescription>
          Extract metadata from images, including dates, camera info, and GPS
          coordinates
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing...</span>
              <span>
                {progress.processed} of {progress.total} ({completionPercentage}
                %)
              </span>
            </div>
            <Progress value={completionPercentage} />
          </div>
        )}

        {!isProcessing && progress.total > 0 && (
          <div className="text-sm">
            <p>
              Processed {progress.processed} of {progress.total} items.
              {progress.failed > 0 && (
                <span className="text-destructive">
                  {' '}
                  Failed: {progress.failed}
                </span>
              )}
            </p>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">
              Errors ({errors.length})
            </h4>
            <div className="bg-muted p-2 rounded max-h-40 overflow-y-auto text-xs">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button onClick={handleProcessItems} disabled={isProcessing}>
          {isProcessing && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
          {isProcessing ? 'Processing...' : 'Process Unprocessed Media'}
        </Button>
      </CardFooter>
    </Card>
  );
}

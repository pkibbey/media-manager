'use client';

import {
  getExifStats,
  streamProcessUnprocessedItems,
} from '@/app/actions/exif';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ExifStatsResult } from '@/types/db-types';
import type { ExtractionMethod } from '@/types/exif';
import type { ExifProgress } from '@/types/exif';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProcessingTimeEstimator } from './processing-time-estimator';

// Type for tracking error frequencies
type ErrorSummary = {
  [errorType: string]: {
    count: number;
    examples: string[];
  };
};

export default function ExifProcessor() {
  const [stats, setStats] = useState<ExifStatsResult>({
    with_exif: 0,
    no_exif: 0,
    total: 0,
    unprocessed: 0,
    skipped: 0,
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<ExifProgress | null>(null);
  const [hasError, setHasError] = useState(false);
  const [skipLargeFiles, setSkipLargeFiles] = useState(true);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary>({});
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [extractionMethod, setExtractionMethod] =
    useState<ExtractionMethod>('default');
  const [batchSize, setBatchSize] = useState<number>(1); // Add batch size state
  const [processingStartTime, setProcessingStartTime] = useState<
    number | undefined
  >(undefined);

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Clean up abortController on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  const fetchStats = async () => {
    const response = await getExifStats();
    const { success, stats: exifStats } = response;

    if (success && exifStats) {
      setStats(exifStats);
    }
  };

  const handleProcess = async () => {
    try {
      setIsStreaming(true);
      setHasError(false);
      setErrorSummary({}); // Reset error summary when starting a new processing run
      setProcessingStartTime(Date.now()); // Set the start time for estimation
      setProgress({
        status: 'processing',
        message: `Starting EXIF processing (max ${batchSize} files)...`,
        largeFilesSkipped: 0,
        filesDiscovered: 0,
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
        method: extractionMethod,
      });

      // Create a new AbortController for this operation
      const controller = new AbortController();
      setAbortController(controller);

      // Call the server action to get a ReadableStream
      const stream = await streamProcessUnprocessedItems({
        skipLargeFiles,
        extractionMethod,
        batchSize, // Pass batch size to server action
      });

      if (!stream) {
        throw new Error('Failed to start EXIF processing stream');
      }

      // Create a new ReadableStream and TextDecoder to handle the response
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Process stream data
      const processStreamData = async () => {
        try {
          while (true) {
            // Check if we should abort
            if (controller.signal.aborted) {
              reader.cancel('Operation cancelled by user');
              break;
            }

            const { done, value } = await reader.read();

            if (done) {
              // Stream is complete - update UI
              setIsStreaming(false);
              setAbortController(null);

              // If we have a successful completion status in progress, show a toast
              if (progress?.status === 'completed') {
                toast.success('EXIF processing completed successfully');
              }

              // Refresh stats after completion
              fetchStats();
              break;
            }

            // Process the chunk - it may contain multiple events
            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6)) as ExifProgress;
                  setProgress(data);

                  // Track error information when available
                  if (data.error) {
                    // Store the error with its file path
                    const errorType = categorizeError(data.error);
                    const filePath = data.currentFilePath || 'Unknown file';

                    setErrorSummary((prevSummary) => {
                      const newSummary = { ...prevSummary };
                      if (!newSummary[errorType]) {
                        newSummary[errorType] = {
                          count: 0,
                          examples: [],
                        };
                      }

                      newSummary[errorType].count += 1;

                      // Keep up to 3 examples of each error type
                      if (
                        newSummary[errorType].examples.length < 3 &&
                        filePath !== 'Unknown file'
                      ) {
                        newSummary[errorType].examples.push(filePath);
                      }

                      return newSummary;
                    });
                  }

                  if (data.status === 'completed') {
                    // Use the count from the current data event rather than the stale progress state
                    const processedCount = data.filesProcessed || 0;
                    toast.success(
                      `Batch complete: ${processedCount} files processed`,
                    );
                    setProgress((progress) => ({
                      ...progress,
                      status: 'completed',
                      message: `Completed processing batch of ${processedCount} files`,
                      successCount: (progress?.successCount || 0) + 1,
                      method: extractionMethod,
                    }));
                  } else if (data.status === 'error') {
                    setIsStreaming(false);
                    setAbortController(null);
                    setHasError(true);
                    setProgress((progress) => ({
                      ...progress,
                      status: 'completed',
                      message: 'Completed EXIF processing...',
                      failedCount: (progress?.failedCount || 0) + 1,
                      method: extractionMethod,
                    }));

                    // Ensure there's always a meaningful error message
                    const errorMessage =
                      data.error || 'Unknown error occurred during processing';
                    toast.error(`Error processing EXIF data: ${errorMessage}`);
                  }
                } catch (error) {
                  console.error('Error parsing event data:', error, line);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error reading stream:', error);

          setIsStreaming(false);
          setAbortController(null);
          setHasError(true);
          toast.error('Error processing EXIF data stream');
        } finally {
          // Ensure we release the reader lock
          reader.releaseLock();
        }
      };

      // Start processing the stream
      processStreamData();
    } catch (error) {
      setIsStreaming(false);
      setAbortController(null);
      setHasError(true);
      toast.error('Failed to start EXIF processing');

      console.error('Error starting EXIF processing:', error);
    }
  };

  // Handler to cancel processing
  const handleCancel = () => {
    if (abortController) {
      toast.info('Cancelling EXIF processing...');

      // Simply abort the controller which will trigger client-side cleanup
      abortController.abort();

      setIsStreaming(false);
      setAbortController(null);

      // Update UI state
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              message: 'Processing cancelled by user',
            }
          : null,
      );
    }
  };

  // Function to categorize errors into common types for better grouping
  const categorizeError = (errorMessage: string): string => {
    const lowerCaseError = errorMessage.toLowerCase();

    if (lowerCaseError.includes('no such file')) return 'File Not Found';
    if (lowerCaseError.includes('permission denied'))
      return 'Permission Denied';
    if (
      lowerCaseError.includes('corrupt') ||
      lowerCaseError.includes('invalid')
    )
      return 'Corrupt/Invalid File';
    if (lowerCaseError.includes('unsupported')) return 'Unsupported Format';
    if (lowerCaseError.includes('metadata') || lowerCaseError.includes('exif'))
      return 'Metadata Extraction Error';
    if (lowerCaseError.includes('timeout')) return 'Processing Timeout';

    // Default category for uncategorized errors
    return 'Other Errors';
  };

  const totalProcessed = stats.no_exif + stats.with_exif;

  // Calculate processed percentage of processed files for progress bar
  const processedPercentage =
    stats.total > 0 ? (totalProcessed / stats.total) * 100 : 0;

  // Calculate streaming progress percentage
  const streamingProgressPercentage =
    progress?.filesDiscovered && progress.filesDiscovered > 0
      ? ((progress.filesProcessed || 0) / progress.filesDiscovered) * 100
      : 0;

  return (
    <div className="overflow-hidden space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">EXIF Processor</h2>
        <div className="text-sm text-muted-foreground">
          {totalProcessed} / {stats.total} files processed
        </div>
      </div>

      <Progress value={processedPercentage} className="h-2" />

      <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>{stats.with_exif} files with EXIF data</span>
          <span>{stats.no_exif} files processed but no EXIF found</span>
        </div>

        <div className="flex justify-between">
          <span>{stats.unprocessed} files waiting to be processed</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center underline-offset-4 text-xs hover:underline">
                  <InfoCircledIcon className="h-3 w-3 mr-1" /> Processing info
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[300px]">
                EXIF extraction processes files in batches. Large files or
                unsupported formats may take longer.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Extract EXIF data from image and video files. This helps organize your
        media by date, location, and camera information.
        {totalProcessed === 0 && stats.total === 0 ? (
          <span className="block mt-2 text-amber-600 dark:text-amber-500">
            No compatible media files found. This could be due to one of the
            following reasons:
            <ul className="list-disc pl-5 space-y-1 mt-1 text-xs">
              <li>No media items have been added to the database yet</li>
              <li>Media items don't have proper file type associations</li>
              <li>
                No compatible file types (jpg, jpeg, tiff, heic) exist in your
                library
              </li>
            </ul>
          </span>
        ) : (
          stats.unprocessed === 0 &&
          totalProcessed < stats.total && (
            <span className="block mt-1 text-amber-600 dark:text-amber-500">
              Note: The remaining files either have extensions marked as ignored
              in file settings or are file types that don't typically contain
              EXIF data.
            </span>
          )
        )}
      </div>

      {isStreaming && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm gap-4">
            <span className="truncate">{progress?.message}</span>
            <span className="shrink-0">
              {progress?.filesProcessed || 0} / {progress?.filesDiscovered || 0}{' '}
              files
            </span>
          </div>
          <Progress value={streamingProgressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Success: {progress?.successCount || 0}</span>
            <span>Failed: {progress?.failedCount || 0}</span>
            <span>{streamingProgressPercentage.toFixed(1)}%</span>
          </div>

          {/* Add the ProcessingTimeEstimator component */}
          <ProcessingTimeEstimator
            isProcessing={isStreaming}
            processed={progress?.filesProcessed || 0}
            remaining={
              (progress?.filesDiscovered || 0) - (progress?.filesProcessed || 0)
            }
            startTime={processingStartTime}
            label="Est. time remaining"
            rateUnit="files/sec"
          />

          <div className="text-xs text-muted-foreground">
            Skipped {progress?.largeFilesSkipped || 0} large files (over 100MB)
          </div>
          <div className="text-xs text-muted-foreground truncate">
            Current file: {progress?.currentFilePath}
          </div>
        </div>
      )}

      {hasError && (
        <div className="text-sm text-destructive mt-2">
          An error occurred during processing. Check the console for details.
        </div>
      )}

      <div className="flex flex-col items-start gap-6 mt-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="skipLargeFiles"
            checked={skipLargeFiles}
            onCheckedChange={(checked) => setSkipLargeFiles(checked as boolean)}
            disabled={isStreaming || stats.unprocessed === 0}
          />
          <Label htmlFor="skipLargeFiles" className="text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help border-b border-dotted border-gray-400">
                    Skip large files (over 100MB)
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Large files can take a long time to process and often don't
                    contain useful EXIF data. Checking this will improve
                    processing speed.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
        </div>
        <div className="flex gap-4 flex-col">
          <div className="flex space-y-2 gap-2 justify-center">
            <Label
              htmlFor="extractionMethod"
              className="text-sm font-medium mb-0"
            >
              Method:
            </Label>
            <Select
              value={extractionMethod}
              onValueChange={(value) =>
                setExtractionMethod(value as ExtractionMethod)
              }
              disabled={isStreaming || stats.unprocessed === 0}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select extraction method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Sharp Library)</SelectItem>
                <SelectItem value="direct-only">Direct Extraction</SelectItem>
                <SelectItem value="marker-only">
                  Marker-based Extraction
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-y-2 gap-2 justify-center">
            <Label htmlFor="batchSize" className="text-sm font-medium mb-0">
              Batch Size:
            </Label>
            <Select
              value={batchSize.toString()}
              onValueChange={(value) => setBatchSize(Number(value))}
              disabled={isStreaming || stats.unprocessed === 0}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select batch size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleProcess}
              disabled={isStreaming || stats.unprocessed === 0}
              className="w-full"
            >
              {stats.total === 0
                ? 'No Files To Process'
                : isStreaming
                  ? `Processing Batch (${extractionMethod})...`
                  : `Process Next ${batchSize} Files (${extractionMethod})`}
            </Button>

            {/* Cancel button if processing */}
            {isStreaming && (
              <Button
                onClick={handleCancel}
                variant="destructive"
                className="w-full"
              >
                Cancel Processing
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Display error summary when there are failed items */}
      {((progress?.failedCount && progress.failedCount > 0) ||
        Object.keys(errorSummary).length > 0) && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium mb-2">
            EXIF Parsing Failure Summary
          </h3>

          {Object.keys(errorSummary).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {progress?.failedCount} files failed, but detailed information is
              not available.
            </p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(errorSummary)
                .sort(([, a], [, b]) => b.count - a.count) // Sort by count (highest first)
                .map(([errorType, details]) => (
                  <li key={errorType} className="text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">{errorType}:</span>
                      <span>
                        {details.count} {details.count === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    {details.examples.length > 0 && (
                      <div className="mt-1 text-muted-foreground">
                        <div className="text-xs mb-1">Examples:</div>
                        {details.examples.map((example, i) => (
                          <div key={i} className="truncate pl-2 text-[10px]">
                            {example.split('/').pop()}
                            {/* Show just the filename */}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

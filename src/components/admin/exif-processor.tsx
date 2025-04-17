'use client';

import { getExifStats } from '@/app/api/actions/exif';
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
import {} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ExtractionMethod } from '@/types/exif';
import type { ExifProgress } from '@/types/exif';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type EnhancedExifStats = {
  with_exif: number;
  processed_no_exif: number;
  total_processed: number;
  unprocessed: number;
  total: number;
};

// Type for tracking error frequencies
type ErrorSummary = {
  [errorType: string]: {
    count: number;
    examples: string[];
  };
};

export default function ExifProcessor() {
  const [stats, setStats] = useState<EnhancedExifStats>({
    with_exif: 0,
    processed_no_exif: 0,
    total_processed: 0,
    unprocessed: 0,
    total: 0,
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<ExifProgress | null>(null);
  const [hasError, setHasError] = useState(false);
  const [skipLargeFiles, setSkipLargeFiles] = useState(true);
  const [processingEventSource, setProcessingEventSource] =
    useState<EventSource | null>(null);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary>({});
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [extractionMethod, setExtractionMethod] =
    useState<ExtractionMethod>('default');

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (processingEventSource) {
        processingEventSource.close();
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, [processingEventSource, abortController]);

  const fetchStats = async () => {
    const { success, stats: exifStats } = await getExifStats();

    if (success && exifStats) {
      setStats(exifStats as EnhancedExifStats);
    }
  };

  const handleProcess = async () => {
    try {
      setIsStreaming(true);
      setHasError(false);
      setErrorSummary({}); // Reset error summary when starting a new processing run
      setProgress({
        status: 'started',
        message: 'Starting EXIF processing...',
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

      // Start a Server-Sent Events connection with the skipLargeFiles option and extraction method
      const params = new URLSearchParams();
      if (skipLargeFiles) {
        params.append('skipLargeFiles', 'true');
      }

      // Add the extraction method for A/B testing
      params.append('method', extractionMethod);

      // Add the abort signal to the URL as a token
      const abortToken = Math.random().toString(36).substring(2, 15);
      params.append('abortToken', abortToken);

      const url = `/api/media/process-exif?${params.toString()}`;

      const eventSource = new EventSource(url);
      setProcessingEventSource(eventSource);

      // Add a listener for abort events
      controller.signal.addEventListener('abort', () => {
        // Close the event source
        if (eventSource) {
          eventSource.close();
          setProcessingEventSource(null);
        }

        // Send the abort signal to the server
        fetch(`/api/media/process-exif/abort?token=${abortToken}`, {
          method: 'POST',
        }).catch((err) => console.error('Error sending abort signal:', err));

        // Update UI state
        setIsStreaming(false);
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                status: 'error',
                message: 'Processing cancelled by user',
              }
            : null,
        );
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ExifProgress;
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
            eventSource.close();
            setProcessingEventSource(null);
            setIsStreaming(false);
            setAbortController(null);
            toast.success('EXIF processing completed successfully');
            fetchStats(); // Refresh stats after completion
          } else if (data.status === 'error') {
            eventSource.close();
            setProcessingEventSource(null);
            setIsStreaming(false);
            setAbortController(null);
            setHasError(true);
            toast.error(`Error processing EXIF data: ${data.error}`);
          }
        } catch (error) {
          console.error('Error parsing event data:', error, event.data);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setProcessingEventSource(null);
        setIsStreaming(false);
        setAbortController(null);
        setHasError(true);
        toast.error('Connection error while processing EXIF data');
      };
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
      abortController.abort();
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

  // Calculate processed percentage of processed files for progress bar
  const processedPercentage =
    stats.total > 0 ? (stats.total_processed / stats.total) * 100 : 0;

  // Calculate streaming progress percentage
  const streamingProgressPercentage =
    progress?.filesDiscovered && progress.filesDiscovered > 0
      ? ((progress.filesProcessed || 0) / progress.filesDiscovered) * 100
      : 0;

  // Update the mapping logic for method display labels
  const methodDisplayName = (method: string) => {
    switch (method) {
      case 'default':
        return 'Default (Multiple Fallbacks)';
      case 'direct-only':
        return 'Direct Extraction Only';
      case 'marker-only':
        return 'Marker-based Extraction Only';
      case 'sharp-only':
        return 'Sharp Library Only';
      default:
        return method;
    }
  };

  return (
    <div className="overflow-hidden space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">EXIF Processor</h2>
        <div className="text-sm text-muted-foreground">
          {stats.total_processed} / {stats.total} files processed
        </div>
      </div>

      <Progress value={processedPercentage} className="h-2" />

      <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>{stats.with_exif} files with EXIF data</span>
          <span>
            {stats.processed_no_exif} files processed but no EXIF found
          </span>
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

      <p className="text-sm text-muted-foreground">
        Extract EXIF data from image and video files. This helps organize your
        media by date, location, and camera information.
        {stats.unprocessed === 0 && stats.total_processed < stats.total && (
          <span className="block mt-1 text-amber-600 dark:text-amber-500">
            Note: The remaining files either have extensions marked as ignored
            in file settings or are file types that don't typically contain EXIF
            data.
          </span>
        )}
      </p>

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
          </div>
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
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select extraction method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  Default (Multiple Fallbacks)
                </SelectItem>
                <SelectItem value="direct-only">
                  Direct Extraction Only
                </SelectItem>
                <SelectItem value="marker-only">
                  Marker-based Extraction Only
                </SelectItem>
                <SelectItem value="sharp-only">Sharp Library Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleProcess}
              disabled={isStreaming || stats.unprocessed === 0}
              className="w-full"
            >
              {stats.unprocessed === 0
                ? 'No Files To Process'
                : isStreaming
                  ? `Processing (${extractionMethod})...`
                  : `Process EXIF Data (${extractionMethod})`}
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

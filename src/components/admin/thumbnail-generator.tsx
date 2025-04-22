'use client';

import {
  countMissingThumbnails,
  getThumbnailStats,
  streamUnprocessedThumbnails,
} from '@/app/actions/thumbnails';
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
import { BATCH_SIZE, LARGE_FILE_THRESHOLD } from '@/lib/consts';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProcessingTimeEstimator } from './processing-time-estimator';

// Type for tracking error frequencies
type ErrorSummary = {
  [errorType: string]: {
    count: number;
    examples: string[];
  };
};

type ThumbnailProgress = {
  status: 'processing' | 'completed' | 'error';
  message: string;
  currentFilePath?: string;
  fileType?: string;
  error?: string;
};

export default function ThumbnailGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [skipLargeFiles, setSkipLargeFiles] = useState(true);
  const [largeFilesSkipped, setLargeFilesSkipped] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary>({});
  const [detailProgress, setDetailProgress] =
    useState<ThumbnailProgress | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [thumbnailStats, setThumbnailStats] = useState<{
    totalCompatibleFiles: number;
    filesWithThumbnails: number;
    filesPending: number;
    skippedLargeFiles: number;
  } | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<
    number | undefined
  >(undefined);
  const [batchSize, setBatchSize] = useState<number>(BATCH_SIZE);
  const [isBatchComplete, setIsBatchComplete] = useState(false);

  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  const fetchThumbnailStats = useCallback(async () => {
    try {
      const result = await getThumbnailStats();

      if (result.success && result.stats) {
        setThumbnailStats(result.stats);
      } else {
        console.error('Error fetching thumbnail stats:', result.error);
      }
    } catch (error) {
      console.error('Error fetching thumbnail stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchThumbnailStats();
  }, [fetchThumbnailStats]);

  useEffect(() => {
    if (!isGenerating) {
      fetchThumbnailStats();
    }
  }, [isGenerating, fetchThumbnailStats]);

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
    if (lowerCaseError.includes('timeout')) return 'Processing Timeout';
    if (
      lowerCaseError.includes('format') ||
      lowerCaseError.includes('unsupported')
    )
      return 'Unsupported Format';
    if (lowerCaseError.includes('memory')) return 'Out of Memory';
    if (lowerCaseError.includes('large file')) return 'File Too Large';
    if (lowerCaseError.includes('storage')) return 'Storage Error';

    return 'Other Errors';
  };

  const handleGenerateThumbnails = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      setProcessed(0);
      setLargeFilesSkipped(0);
      setSuccessCount(0);
      setFailedCount(0);
      setErrorSummary({});
      setHasError(false);
      setIsBatchComplete(false);
      setDetailProgress({
        status: 'processing',
        message: 'Starting thumbnail generation...',
      });

      const controller = new AbortController();
      setAbortController(controller);

      const startTime = Date.now();
      setProcessingStartTime(startTime);

      const countResult = await countMissingThumbnails();
      if (!countResult.success) {
        throw new Error(
          countResult.error || 'Failed to count missing thumbnails',
        );
      }

      const totalToProcess = countResult.count || 0;
      setTotal(totalToProcess);

      if (totalToProcess === 0) {
        toast.success('No thumbnails to generate');
        setIsGenerating(false);
        setAbortController(null);
        setDetailProgress({
          status: 'completed',
          message: 'All thumbnails already generated.',
        });
        return;
      }

      // Determine batch count for the message
      const currentBatchSize = Math.min(batchSize, totalToProcess);

      toast.success(
        `Generating thumbnails for ${currentBatchSize} of ${totalToProcess} media items${
          skipLargeFiles ? ' (skipping large files)' : ''
        }.`,
      );

      const stream = await streamUnprocessedThumbnails({
        skipLargeFiles,
        batchSize,
      });

      if (!stream) {
        throw new Error('Failed to start thumbnail processing stream');
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          // Check if the user has aborted the operation
          if (controller.signal.aborted) {
            reader.cancel('Operation cancelled by user');
            setDetailProgress({
              status: 'error',
              message: 'Thumbnail generation cancelled by user',
            });
            break;
          }

          const { done, value } = await reader.read();

          if (done) {
            // Stream has completed - either successfully or was aborted
            setIsGenerating(false);
            setAbortController(null);

            // If we have a completed status in our progress, show success
            if (detailProgress?.status === 'completed') {
              const completionMessage = isBatchComplete
                ? `Batch complete: Generated ${processed} thumbnails`
                : 'All pending thumbnails have been generated';
              toast.success(completionMessage);
            }

            // Refresh stats after completion
            fetchThumbnailStats();
            break;
          }

          const text = decoder.decode(value);
          const messages = text.split('\n\n');

          for (const message of messages) {
            if (!message.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(message.substring(6));

              if (data.status === 'error') {
                setHasError(true);
                if (data.error) {
                  const errorType = categorizeError(data.error);
                  setErrorSummary((prev) => {
                    const newSummary = { ...prev };
                    if (!newSummary[errorType]) {
                      newSummary[errorType] = { count: 0, examples: [] };
                    }
                    newSummary[errorType].count += 1;
                    if (newSummary[errorType].examples.length < 3) {
                      newSummary[errorType].examples.push(data.error);
                    }
                    return newSummary;
                  });
                }
              }

              if (data.totalItems) {
                setTotal(data.totalItems);
              }

              if (data.processed !== undefined) {
                setProcessed(data.processed);
                if (data.totalItems) {
                  // For batch processing, calculate progress based on current batch size instead of total
                  const progressPercent = Math.round(
                    (data.processed / Math.min(batchSize, data.totalItems)) *
                      100,
                  );
                  setProgress(progressPercent);
                }
              }

              if (data.successCount !== undefined) {
                setSuccessCount(data.successCount);
              }

              if (data.failedCount !== undefined) {
                setFailedCount(data.failedCount);
              }

              if (data.skippedLargeFiles !== undefined) {
                setLargeFilesSkipped(data.skippedLargeFiles);
              }

              if (data.currentFilePath || data.currentFileName) {
                setDetailProgress((prev) => ({
                  ...prev!,
                  message: data.message || prev?.message,
                  currentFilePath:
                    data.currentFilePath || prev?.currentFilePath,
                  fileType: data.fileType || prev?.fileType,
                }));
              } else if (data.message) {
                setDetailProgress((prev) => ({
                  ...prev!,
                  message: data.message,
                }));
              }

              if (data.status === 'completed') {
                setDetailProgress((prev) => ({
                  ...prev!,
                  status: 'completed',
                }));
              }
            } catch (parseError) {
              console.error('Error parsing stream data:', parseError);
            }
          }
        }
      } catch (streamError) {
        console.error('Error reading from stream:', streamError);
        setHasError(true);
        throw streamError;
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unknown error occurred';
      toast.error(`Error generating thumbnails: ${errorMessage}`);
      console.error('Error generating thumbnails:', error);
      setHasError(true);

      setDetailProgress({
        status: 'error',
        message: `Error: ${errorMessage}`,
        error: errorMessage,
      });

      const errorType = categorizeError(errorMessage);
      setErrorSummary((prev) => {
        const newSummary = { ...prev };
        if (!newSummary[errorType]) {
          newSummary[errorType] = { count: 0, examples: [] };
        }
        newSummary[errorType].count += 1;
        if (newSummary[errorType].examples.length < 3) {
          newSummary[errorType].examples.push('General processing error');
        }
        return newSummary;
      });
    } finally {
      setIsGenerating(false);
      setAbortController(null);
      fetchThumbnailStats();
    }
  };

  const handleCancel = async () => {
    if (abortController) {
      toast.info('Cancelling thumbnail generation...', {
        id: 'cancel-toast',
        duration: 3000,
      });

      // Abort the controller to stop the client-side processing
      abortController.abort();

      // Update UI immediately
      setIsGenerating(false);
      setAbortController(null);

      setDetailProgress({
        status: 'error',
        message: 'Thumbnail generation cancelled by user',
      });

      // Refresh stats after cancellation
      fetchThumbnailStats();
    }
  };

  return (
    <div className="overflow-hidden space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">Thumbnail Generator</h2>
        <div className="text-sm text-muted-foreground">
          {!thumbnailStats ? (
            <span>Loading stats...</span>
          ) : (
            <span>
              {thumbnailStats.filesWithThumbnails} /{' '}
              {thumbnailStats.totalCompatibleFiles} files processed
            </span>
          )}
        </div>
      </div>

      <Progress
        value={
          !thumbnailStats
            ? undefined
            : thumbnailStats.filesPending === 0
              ? 100
              : Math.round(
                  (thumbnailStats.filesWithThumbnails /
                    thumbnailStats.totalCompatibleFiles) *
                    100,
                )
        }
        className="h-2"
      />

      <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>
            {thumbnailStats
              ? `${thumbnailStats.filesWithThumbnails} files with thumbnails`
              : 'Loading...'}
          </span>
          <span>
            {thumbnailStats
              ? `${thumbnailStats.skippedLargeFiles} large files skipped`
              : 'Loading...'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>
            {thumbnailStats
              ? `${thumbnailStats.filesPending} files waiting to be processed`
              : 'Loading...'}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dotted border-gray-400">
                  {thumbnailStats
                    ? `${thumbnailStats.totalCompatibleFiles} total thumbnail-compatible files`
                    : 'Loading thumbnail-compatible files...'}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Compatible image formats: JPG, JPEG, PNG, WebP, GIF, TIFF,
                  HEIC, AVIF, BMP. Excluded are files with extensions marked as
                  "ignored" in file settings.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Generate thumbnails for image files and store them in Supabase Storage.
        This helps improve performance by pre-generating thumbnails instead of
        creating them on-demand. Only processes images (.jpg, .png, .webp, .gif,
        etc.).
      </p>

      {isGenerating && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm gap-4">
            <span className="truncate">{detailProgress?.message}</span>
            <span className="shrink-0">
              {processed} / {Math.min(batchSize, total)} files
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Success: {successCount}</span>
            <span>Failed: {failedCount}</span>
            <span>{progress}%</span>
          </div>

          <ProcessingTimeEstimator
            isProcessing={isGenerating}
            processed={processed}
            remaining={Math.min(batchSize, total) - processed}
            startTime={processingStartTime}
            rateUnit="thumbnails/sec"
          />

          {largeFilesSkipped > 0 && (
            <div className="text-xs text-muted-foreground">
              {`Skipped ${largeFilesSkipped} large files (over ${Math.round(
                LARGE_FILE_THRESHOLD / 1024 / 1024,
              )}MB)`}
            </div>
          )}
          <div className="text-xs text-muted-foreground truncate mt-1 flex justify-between">
            <span>Current file: {detailProgress?.currentFilePath || '_'}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-secondary">
              .{detailProgress?.fileType || '??'}
            </span>
          </div>
        </div>
      )}

      {hasError && (
        <div className="text-sm text-destructive mt-2">
          Some errors occurred during processing. See details below.
        </div>
      )}

      <div className="flex items-center space-x-2 mt-2">
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
                  {`Skip large files (over ${Math.round(
                    LARGE_FILE_THRESHOLD / 1024 / 1024,
                  )}MB)`}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Large files can take a long time to process and may cause
                  timeouts. Checking this will improve processing speed.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
      </div>

      <div className="flex space-y-2 gap-2 items-center">
        <Label htmlFor="batchSize" className="text-sm font-medium mb-0">
          Batch Size:
        </Label>
        <Select
          value={batchSize.toString()}
          onValueChange={(value) => setBatchSize(Number(value))}
          disabled={isGenerating}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder="Select batch size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="500">500</SelectItem>
            <SelectItem value="1000">1000</SelectItem>
            <SelectItem value="5000">5000</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleGenerateThumbnails}
          disabled={
            isGenerating ||
            !thumbnailStats ||
            (thumbnailStats && thumbnailStats.filesPending === 0) ||
            false
          }
        >
          {!thumbnailStats
            ? 'Loading...'
            : thumbnailStats.filesPending === 0 && !isGenerating
              ? 'All Thumbnails Generated'
              : isGenerating
                ? 'Generating...'
                : `Generate ${Math.min(batchSize, thumbnailStats?.filesPending || 0)} Thumbnails`}
        </Button>

        {isGenerating && (
          <Button onClick={handleCancel} variant="destructive">
            Cancel
          </Button>
        )}
      </div>

      {failedCount > 0 && Object.keys(errorSummary).length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium mb-2">
            Thumbnail Generation Failure Summary
          </h3>

          <ul className="space-y-3">
            {Object.entries(errorSummary)
              .sort(([, a], [, b]) => b.count - a.count)
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
                        <div
                          key={`${errorType}-example-${i}-${example.substring(
                            0,
                            10,
                          )}`}
                          className="truncate pl-2 text-[10px]"
                        >
                          {example}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

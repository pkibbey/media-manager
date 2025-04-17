'use client';

import {
  countMissingThumbnails,
  generateMissingThumbnails,
  getThumbnailStats,
} from '@/actions/thumbnails';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LARGE_FILE_THRESHOLD } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Type for tracking error frequencies
type ErrorSummary = {
  [errorType: string]: {
    count: number;
    examples: string[];
  };
};

type ThumbnailProgress = {
  status: 'started' | 'generating' | 'completed' | 'error';
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
  const [remainingThumbnails, setRemainingThumbnails] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary>({});
  const [detailProgress, setDetailProgress] =
    useState<ThumbnailProgress | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  // Add abort controller state
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // Add thumbnail stats state
  const [thumbnailStats, setThumbnailStats] = useState<{
    totalCompatibleFiles: number;
    filesWithThumbnails: number;
    filesSkipped: number;
    filesPending: number;
    skippedLargeFiles: number;
  } | null>(null);

  // Cleanup function for the abort controller
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  // Fetch the count of items that still need thumbnails
  const fetchRemainingCount = useCallback(async () => {
    try {
      setIsLoading(true);

      const result = await countMissingThumbnails();

      if (result.success) {
        setRemainingThumbnails(result.count || 0);
      } else {
        console.error(
          'Failed to fetch remaining thumbnails count:',
          result.error,
        );
        setRemainingThumbnails(null);
      }
    } catch (error) {
      console.error('Error fetching remaining thumbnails count:', error);
      setRemainingThumbnails(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to fetch thumbnail statistics
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

  // Fetch remaining count when component mounts
  useEffect(() => {
    fetchRemainingCount();
  }, [fetchRemainingCount]);

  // Fetch thumbnail stats when component mounts
  useEffect(() => {
    fetchThumbnailStats();
  }, [fetchThumbnailStats]);

  // Re-fetch count after generation completes
  useEffect(() => {
    if (!isGenerating) {
      fetchRemainingCount();
    }
  }, [isGenerating, fetchRemainingCount]);

  // Re-fetch stats after generation completes
  useEffect(() => {
    if (!isGenerating) {
      fetchThumbnailStats();
    }
  }, [isGenerating, fetchThumbnailStats]);

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
    if (lowerCaseError.includes('timeout')) return 'Processing Timeout';
    if (
      lowerCaseError.includes('format') ||
      lowerCaseError.includes('unsupported')
    )
      return 'Unsupported Format';
    if (lowerCaseError.includes('memory')) return 'Out of Memory';
    if (lowerCaseError.includes('large file')) return 'File Too Large';
    if (lowerCaseError.includes('storage')) return 'Storage Error';

    // Default category for uncategorized errors
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
      setDetailProgress({
        status: 'started',
        message: 'Starting thumbnail generation...',
      });

      // Create a new abort controller
      const controller = new AbortController();
      setAbortController(controller);

      // Use the direct server action to get the count
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

      // Process in batches of 20
      const batchSize = 20;
      let currentProcessed = 0;
      let totalLargeFilesSkipped = 0;
      let totalSuccessCount = 0;
      let totalFailedCount = 0;

      toast.success(
        `Generating thumbnails for ${totalToProcess} media items${skipLargeFiles ? ' (skipping large files)' : ''}.`,
      );

      setDetailProgress({
        status: 'generating',
        message: `Starting batch processing for ${totalToProcess} items...`,
      });

      while (currentProcessed < totalToProcess) {
        // Check if the operation was cancelled
        if (controller.signal.aborted) {
          setDetailProgress({
            status: 'error',
            message: 'Thumbnail generation cancelled by user',
          });
          break;
        }

        setDetailProgress({
          status: 'generating',
          message: `Processing batch ${Math.ceil(currentProcessed / batchSize) + 1} of ${Math.ceil(
            totalToProcess / batchSize,
          )}`,
        });

        const result = await generateMissingThumbnails(batchSize, {
          skipLargeFiles,
        });

        if (!result.success) {
          toast.error(`Error generating thumbnails: ${result.message}`);
          setHasError(true);

          // Add to error summary
          if (result.message) {
            const errorType = categorizeError(result.message);

            setErrorSummary((prev) => {
              const newSummary = { ...prev };
              if (!newSummary[errorType]) {
                newSummary[errorType] = { count: 0, examples: [] };
              }
              newSummary[errorType].count += 1;
              if (newSummary[errorType].examples.length < 3) {
                newSummary[errorType].examples.push(
                  result.message || 'Unknown error',
                );
              }
              return newSummary;
            });
          }

          setDetailProgress({
            status: 'error',
            message: `Error in batch: ${result.message}`,
            error: result.message,
          });

          break;
        }

        // Check if the operation was cancelled after this batch
        if (controller.signal.aborted) {
          setDetailProgress({
            status: 'error',
            message: 'Thumbnail generation cancelled by user',
          });
          break;
        }

        currentProcessed += result.processed ?? 0;
        setProcessed(currentProcessed);
        setProgress(Math.round((currentProcessed / totalToProcess) * 100));

        // Track large files skipped
        if (result.skippedLargeFiles) {
          totalLargeFilesSkipped += result.skippedLargeFiles;
          setLargeFilesSkipped(totalLargeFilesSkipped);
        }

        // Track success and failures
        if (result.successCount) {
          totalSuccessCount += result.successCount;
          setSuccessCount(totalSuccessCount);
        }

        if (result.failedCount) {
          totalFailedCount += result.failedCount;
          setFailedCount(totalFailedCount);
        }

        // Track current file being processed
        if (result.currentFilePath) {
          setDetailProgress((prev) => ({
            ...prev!,
            currentFilePath: result.currentFilePath,
            fileType: result.currentFilePath?.split('.').pop()?.toLowerCase(),
          }));
        }

        // Record any errors
        if (result.errors && result.errors.length > 0) {
          setHasError(true);

          // Process each error into the summary
          result.errors.forEach((error) => {
            if (!error.path || !error.message) return;

            const errorType = categorizeError(error.message);
            const fileName = error.path.split('/').pop() || error.path;

            setErrorSummary((prev) => {
              const newSummary = { ...prev };
              if (!newSummary[errorType]) {
                newSummary[errorType] = { count: 0, examples: [] };
              }
              newSummary[errorType].count += 1;
              if (newSummary[errorType].examples.length < 3) {
                newSummary[errorType].examples.push(fileName);
              }
              return newSummary;
            });
          });
        }

        if (result.processed === 0) {
          // No more items to process
          break;
        }
      }

      // Only show completion message if we weren't aborted
      if (!controller.signal.aborted) {
        const message = `Generated thumbnails for ${currentProcessed - totalLargeFilesSkipped} media items${totalLargeFilesSkipped ? `, skipped ${totalLargeFilesSkipped} large files` : ''}.`;
        toast.success(message);

        setDetailProgress({
          status: 'completed',
          message,
        });
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

      // Add to error summary
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
    }
  };

  // Add cancel handler
  const handleCancel = () => {
    if (abortController) {
      toast.info('Cancelling thumbnail generation...');
      abortController.abort();
    }
  };

  return (
    <div className="overflow-hidden space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">Thumbnail Generator</h2>
        <div className="text-sm text-muted-foreground">
          {isLoading || !thumbnailStats ? (
            <span>Loading...</span>
          ) : (
            <span>
              {thumbnailStats.filesWithThumbnails + thumbnailStats.filesSkipped}{' '}
              / {thumbnailStats.totalCompatibleFiles} files processed
            </span>
          )}
        </div>
      </div>

      {/* Progress bar for overall thumbnail generation */}
      {thumbnailStats && (
        <Progress
          value={
            thumbnailStats.filesPending === 0
              ? 100
              : Math.round(
                  (thumbnailStats.filesWithThumbnails /
                    thumbnailStats.totalCompatibleFiles) *
                    100,
                )
          }
          className="h-2"
        />
      )}

      {/* Thumbnail statistics summary */}
      {thumbnailStats && (
        <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span>
              {thumbnailStats.filesWithThumbnails} files with thumbnails
            </span>
            <span>{thumbnailStats.skippedLargeFiles} large files skipped</span>
          </div>
          <div className="flex justify-between">
            <span>
              {thumbnailStats.filesPending} files waiting to be processed
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help border-b border-dotted border-gray-400">
                    {thumbnailStats.totalCompatibleFiles} total
                    thumbnail-compatible files
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Compatible image formats: JPG, JPEG, PNG, WebP, GIF, TIFF,
                    HEIC, AVIF, BMP. Excluded are files with extensions marked
                    as "ignored" in file settings.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-muted-foreground">
        Generate thumbnails for image files and store them in Supabase Storage.
        This helps improve performance by pre-generating thumbnails instead of
        creating them on-demand. Only processes images (.jpg, .png, .webp, .gif,
        etc.).
      </p>

      {/* Current processing status */}
      {isGenerating && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm gap-4">
            <span className="truncate">{detailProgress?.message}</span>
            <span className="shrink-0">
              {processed} / {total} files
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Success: {successCount}</span>
            <span>Failed: {failedCount}</span>
            <span>{progress}%</span>
          </div>
          {largeFilesSkipped > 0 && (
            <div className="text-xs text-muted-foreground">
              {`Skipped ${largeFilesSkipped} large files (over ${Math.round(LARGE_FILE_THRESHOLD / 1024 / 1024)}MB)`}
            </div>
          )}
          <div className="text-xs text-muted-foreground truncate mt-1">
            Current file: {detailProgress?.currentFilePath || '--'}
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-secondary">
              .{detailProgress?.fileType || '??'}
            </span>
          </div>
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div className="text-sm text-destructive mt-2">
          Some errors occurred during processing. See details below.
        </div>
      )}

      {/* Skip large files checkbox */}
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
                  {`Skip large files (over ${Math.round(LARGE_FILE_THRESHOLD / 1024 / 1024)}MB)`}
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

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleGenerateThumbnails}
          disabled={
            isGenerating ||
            (thumbnailStats && thumbnailStats.filesPending === 0) ||
            false
          }
        >
          {thumbnailStats && thumbnailStats.filesPending === 0 && !isGenerating
            ? 'All Thumbnails Generated'
            : isGenerating
              ? 'Generating...'
              : 'Generate Thumbnails'}
        </Button>

        {isGenerating && (
          <Button onClick={handleCancel} variant="destructive">
            Cancel
          </Button>
        )}
      </div>

      {/* Display error summary when there are failed items */}
      {failedCount > 0 && Object.keys(errorSummary).length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium mb-2">
            Thumbnail Generation Failure Summary
          </h3>

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
                        <div
                          key={`${errorType}-example-${i}-${example.substring(0, 10)}`}
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

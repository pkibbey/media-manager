'use client';

import { getExifStats } from '@/app/api/actions/exif';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatBytes } from '@/lib/utils';
import type { PerformanceMetrics } from '@/types/db-types';
import type { ExifProgress, ExtractionMethod } from '@/types/exif';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
  const [activeTab, setActiveTab] = useState('processor');
  const [extractionMethod, setExtractionMethod] =
    useState<ExtractionMethod>('default');
  const [performanceMetrics, setPerformanceMetrics] = useState<
    PerformanceMetrics[]
  >([]);

  // Limit for A/B testing to prevent long processing times
  const AB_TESTING_LIMIT = 500;

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
            fetchPerformanceMetrics(); // Get the performance metrics
            setActiveTab('metrics'); // Switch to metrics tab
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

  // Fetch performance metrics from the database
  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*');
      if (error) {
        throw new Error(error.message);
      }
      setPerformanceMetrics(data || []);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    }
  }, []);

  // Clear performance metrics for all methods, not just the current one
  const clearAllPerformanceMetrics = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('performance_metrics')
        .delete()
        .filter('id', 'not.is', null); // Select all non-null IDs (all rows)

      if (error) {
        throw new Error(error.message);
      }

      toast.success('All performance metrics cleared successfully');
    } catch (error) {
      console.error('Error clearing all performance metrics:', error);
      toast.error('Failed to clear performance metrics');
    }
  }, []);

  // Clear performance metrics
  const handleClearMetrics = async () => {
    try {
      await clearAllPerformanceMetrics();
      setPerformanceMetrics([]);
      toast.success('All performance metrics cleared');
    } catch (error) {
      console.error('Error clearing performance metrics:', error);
      toast.error('Failed to clear performance metrics');
    }
  };

  // Load performance metrics when metrics tab is activated
  useEffect(() => {
    if (activeTab === 'metrics') {
      fetchPerformanceMetrics();
    }
  }, [activeTab, fetchPerformanceMetrics]);

  // Calculate processed percentage of processed files for progress bar
  const processedPercentage =
    stats.total > 0 ? (stats.total_processed / stats.total) * 100 : 0;

  // Calculate streaming progress percentage
  const streamingProgressPercentage =
    progress?.filesDiscovered && progress.filesDiscovered > 0
      ? ((progress.filesProcessed || 0) / progress.filesDiscovered) * 100
      : 0;

  // Calculate performance metrics summaries
  const getPerformanceMetricsSummary = () => {
    if (performanceMetrics.length === 0) {
      return null;
    }

    // Group metrics by method
    const methodGrouped = performanceMetrics.reduce<
      Record<string, PerformanceMetrics[]>
    >((acc, metric) => {
      if (!acc[metric.method]) acc[metric.method] = [];
      acc[metric.method].push(metric);
      return acc;
    }, {});

    // Calculate average duration and success rate by method
    const summaries = Object.entries(methodGrouped).map(([method, metrics]) => {
      const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
      const avgDuration = totalDuration / metrics.length;
      const successCount = metrics.filter((m) => m.success).length;
      const successRate = (successCount / metrics.length) * 100;

      return {
        method,
        count: metrics.length,
        avgDuration,
        successRate,
        metrics,
      };
    });

    return summaries;
  };

  const performanceMetricsSummary = getPerformanceMetricsSummary();

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="processor">EXIF Processor</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="processor" className="space-y-4">
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
                      <InfoCircledIcon className="h-3 w-3 mr-1" /> Processing
                      info
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[300px]">
                    EXIF extraction processes files in batches. Large files or
                    unsupported formats may take longer.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Estimated processing time */}
            {performanceMetrics.length > 0 && stats.unprocessed > 0 && (
              <div className="flex justify-between mt-2 pt-2 border-t border-border">
                <span className="font-medium text-foreground">
                  Est. Processing Time:
                </span>
                <span>
                  {(() => {
                    // Calculate average processing time across all metrics
                    const avgTimePerFile =
                      performanceMetrics.reduce(
                        (sum, metric) => sum + metric.duration,
                        0,
                      ) / performanceMetrics.length; // in ms

                    // Estimate total time for unprocessed files
                    const totalEstimatedMs = avgTimePerFile * stats.unprocessed;

                    // Format nicely based on duration
                    if (totalEstimatedMs < 1000) {
                      return `${totalEstimatedMs.toFixed(0)} ms`;
                    }
                    if (totalEstimatedMs < 60000) {
                      return `${(totalEstimatedMs / 1000).toFixed(1)} seconds`;
                    }
                    if (totalEstimatedMs < 3600000) {
                      return `${(totalEstimatedMs / 60000).toFixed(1)} minutes`;
                    }
                    return `${(totalEstimatedMs / 3600000).toFixed(1)} hours`;
                  })()}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Extract EXIF data from image and video files. This helps organize
            your media by date, location, and camera information.
            {stats.unprocessed === 0 && stats.total_processed < stats.total && (
              <span className="block mt-1 text-amber-600 dark:text-amber-500">
                Note: The remaining files either have extensions marked as
                ignored in file settings or are file types that don't typically
                contain EXIF data.
              </span>
            )}
          </p>

          {isStreaming && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm gap-4">
                <span className="truncate">{progress?.message}</span>
                <span className="shrink-0">
                  {progress?.filesProcessed || 0} /{' '}
                  {progress?.filesDiscovered || 0} files
                </span>
              </div>
              <Progress value={streamingProgressPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Success: {progress?.successCount || 0}</span>
                <span>Failed: {progress?.failedCount || 0}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Skipped {progress?.largeFilesSkipped || 0} large files (over
                100MB)
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Current file: {progress?.currentFilePath}
              </div>
            </div>
          )}

          {hasError && (
            <div className="text-sm text-destructive mt-2">
              An error occurred during processing. Check the console for
              details.
            </div>
          )}

          <div className="flex flex-col items-start gap-6 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipLargeFiles"
                checked={skipLargeFiles}
                onCheckedChange={(checked) =>
                  setSkipLargeFiles(checked as boolean)
                }
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
                        Large files can take a long time to process and often
                        don't contain useful EXIF data. Checking this will
                        improve processing speed.
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
                    <SelectItem value="sharp-only">
                      Sharp Library Only
                    </SelectItem>
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
                  {progress?.failedCount} files failed, but detailed information
                  is not available.
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
                            {details.count}{' '}
                            {details.count === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                        {details.examples.length > 0 && (
                          <div className="mt-1 text-muted-foreground">
                            <div className="text-xs mb-1">Examples:</div>
                            {details.examples.map((example, i) => (
                              <div
                                key={i}
                                className="truncate pl-2 text-[10px]"
                              >
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
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">EXIF Performance Metrics</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearMetrics}
              disabled={performanceMetrics.length === 0}
            >
              Clear Metrics
            </Button>
          </div>

          {performanceMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No performance data available yet. Process some files to collect
              metrics.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Performance summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {performanceMetricsSummary?.map((summary) => (
                  <Card key={summary.method} className="p-4">
                    <h3 className="text-md font-medium mb-2">
                      {methodDisplayName(summary.method)}
                    </h3>
                    <div className="text-sm space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">
                          Files processed:
                        </span>
                        <span className="font-medium">{summary.count}</span>

                        <span className="text-muted-foreground">
                          Avg. processing time:
                        </span>
                        <span className="font-medium">
                          {summary.avgDuration.toFixed(2)} ms
                        </span>

                        <span className="text-muted-foreground">
                          Success rate:
                        </span>
                        <span className="font-medium">
                          {summary.successRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Performance by file type */}
              {performanceMetricsSummary &&
                performanceMetricsSummary.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-md font-medium border-b pb-1">
                      Performance by File Type
                    </h3>
                    <div className="space-y-4">
                      {performanceMetricsSummary.map((summary) => {
                        // Group by file type
                        const byFileType = summary.metrics.reduce<
                          Record<string, PerformanceMetrics[]>
                        >((acc, metric) => {
                          if (!acc[metric.file_type])
                            acc[metric.file_type] = [];
                          acc[metric.file_type].push(metric);
                          return acc;
                        }, {});

                        return Object.entries(byFileType).length > 0 ? (
                          <div
                            key={`${summary.method}-filetypes`}
                            className="space-y-2"
                          >
                            <h4 className="text-sm font-medium">
                              {methodDisplayName(summary.method)}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {Object.entries(byFileType)
                                .sort(([, a], [, b]) => b.length - a.length)
                                .map(([fileType, metrics]) => {
                                  const avgDuration =
                                    metrics.reduce(
                                      (sum, m) => sum + m.duration,
                                      0,
                                    ) / metrics.length;
                                  const successCount = metrics.filter(
                                    (m) => m.success,
                                  ).length;
                                  const successRate =
                                    (successCount / metrics.length) * 100;
                                  const avgSize =
                                    metrics.reduce(
                                      (sum, m) => sum + m.file_size,
                                      0,
                                    ) / metrics.length;

                                  return (
                                    <div
                                      key={`${summary.method}-${fileType}`}
                                      className="border rounded p-2 text-xs"
                                    >
                                      <div className="font-medium mb-1">
                                        {fileType.toUpperCase()}
                                      </div>
                                      <div className="grid grid-cols-2 gap-1">
                                        <span className="text-muted-foreground">
                                          Count:
                                        </span>
                                        <span>{metrics.length}</span>

                                        <span className="text-muted-foreground">
                                          Avg. time:
                                        </span>
                                        <span>{avgDuration.toFixed(1)} ms</span>

                                        <span className="text-muted-foreground">
                                          Success:
                                        </span>
                                        <span>{successRate.toFixed(0)}%</span>

                                        <span className="text-muted-foreground">
                                          Avg. size:
                                        </span>
                                        <span>{formatBytes(avgSize)}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

              {/* Detailed metrics table */}
              <details className="mt-4">
                <summary className="text-sm font-medium cursor-pointer">
                  Show Detailed Metrics ({performanceMetrics.length} records)
                </summary>
                <div className="mt-2 overflow-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Method</th>
                        <th className="p-2 text-left">File Type</th>
                        <th className="p-2 text-left">Size</th>
                        <th className="p-2 text-left">Duration (ms)</th>
                        <th className="p-2 text-left">Success</th>
                        <th className="p-2 text-left">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceMetrics
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp || '').getTime() -
                            new Date(a.timestamp || '').getTime(),
                        )
                        .map((metric, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2">
                              {methodDisplayName(metric.method)}
                            </td>
                            <td className="p-2">{metric.file_type}</td>
                            <td className="p-2">
                              {formatBytes(metric.file_size)}
                            </td>
                            <td className="p-2">
                              {metric.duration.toFixed(2)}
                            </td>
                            <td className="p-2">
                              {metric.success ? '✅' : '❌'}
                            </td>
                            {metric.timestamp && (
                              <td className="p-2">
                                {new Date(metric.timestamp).toLocaleString()}
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { type ExifProgress, getExifStats } from '@/app/api/actions/exif';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type EnhancedExifStats = {
  with_exif: number;
  processed_no_exif: number;
  total_processed: number;
  unprocessed: number;
  total: number;
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
  const [processingEventSource, setProcessingEventSource] =
    useState<EventSource | null>(null);

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
    };
  }, [processingEventSource]);

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
      setProgress({
        status: 'started',
        message: 'Starting EXIF processing...',
        filesDiscovered: 0,
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
      });

      // Start a Server-Sent Events connection
      const eventSource = new EventSource('/api/media/process-exif');
      setProcessingEventSource(eventSource);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ExifProgress;
          setProgress(data);

          if (data.status === 'completed') {
            eventSource.close();
            setProcessingEventSource(null);
            setIsStreaming(false);
            toast.success('EXIF processing completed successfully');
            fetchStats(); // Refresh stats after completion
          } else if (data.status === 'error') {
            eventSource.close();
            setProcessingEventSource(null);
            setIsStreaming(false);
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
        setHasError(true);
        toast.error('Connection error while processing EXIF data');
      };
    } catch (error) {
      setIsStreaming(false);
      setHasError(true);
      toast.error('Failed to start EXIF processing');
      console.error('Error starting EXIF processing:', error);
    }
  };

  // Calculate percentage of processed files for progress bar
  const processedPercentage =
    stats.total > 0
      ? (stats.total_processed / (stats.total - stats.unprocessed)) * 100
      : 0;

  // Calculate streaming progress percentage
  const streamingProgressPercentage =
    progress?.filesDiscovered && progress.filesDiscovered > 0
      ? ((progress.filesProcessed || 0) / progress.filesDiscovered) * 100
      : 0;

  return (
    <div className="border rounded-md p-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">EXIF Processor</h2>
        <div className="text-sm text-muted-foreground">
          {stats.total_processed} / {stats.total - stats.unprocessed} files
          processed
        </div>
      </div>

      <Progress value={processedPercentage} className="h-2" />

      <div className="text-xs flex justify-between text-muted-foreground">
        <span>{stats.with_exif} files with EXIF data</span>
        <span>{stats.processed_no_exif} files processed but no EXIF found</span>
      </div>

      <p className="text-sm text-muted-foreground">
        Extract EXIF data from image and video files. This helps organize your
        media by date, location, and camera information.
      </p>

      {isStreaming && progress && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{progress.message}</span>
            <span>
              {progress.filesProcessed || 0} / {progress.filesDiscovered || 0}{' '}
              files
            </span>
          </div>
          <Progress value={streamingProgressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Success: {progress.successCount || 0}</span>
            <span>Failed: {progress.failedCount || 0}</span>
          </div>
          {progress.currentFilePath && (
            <div className="text-xs text-muted-foreground truncate">
              Current file: {progress.currentFilePath}
            </div>
          )}
        </div>
      )}

      {hasError && (
        <div className="text-sm text-destructive mt-2">
          An error occurred during processing. Check the console for details.
        </div>
      )}

      <Button
        onClick={handleProcess}
        disabled={isStreaming || processedPercentage === 100}
        className="w-full"
      >
        {processedPercentage === 100 && !isStreaming
          ? 'Already Processed'
          : isStreaming
            ? 'Processing...'
            : 'Process EXIF Data'}
      </Button>
    </div>
  );
}

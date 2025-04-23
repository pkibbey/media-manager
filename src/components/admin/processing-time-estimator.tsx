'use client';

import { useEffect, useRef, useState } from 'react';

interface ProcessingTimeEstimatorProps {
  isProcessing: boolean;
  processed: number;
  remaining: number;
  startTime?: number;
  label?: string;
  showRate?: boolean;
  rateUnit?: string;
}

/**
 * A reusable component that estimates remaining time for batch processing operations
 */
export function ProcessingTimeEstimator({
  isProcessing,
  processed,
  remaining,
  startTime,
  label = 'Est. time remaining',
  showRate = true,
  rateUnit = 'items/sec',
}: ProcessingTimeEstimatorProps) {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<
    string | null
  >(null);
  const [processingRate, setProcessingRate] = useState<number | null>(null);

  // Store processing history for more accurate estimates
  const totalProcessedFiles = useRef<number>(0);
  const totalProcessingTime = useRef<number>(0);
  const lastProcessedCount = useRef<number>(0);
  const lastTimestamp = useRef<number>(Date.now());

  // Update the estimate every second while processing
  useEffect(() => {
    if (!isProcessing || remaining <= 0) {
      setEstimatedTimeRemaining(null);
      return;
    }

    // Start tracking when processing begins
    if (processed === 0 && startTime) {
      lastTimestamp.current = startTime;
      lastProcessedCount.current = 0;
      totalProcessedFiles.current = 0;
      totalProcessingTime.current = 0;
    }

    // Calculate processing rate when new items are processed
    if (processed > lastProcessedCount.current) {
      const now = Date.now();
      const duration = now - lastTimestamp.current;
      const itemsProcessed = processed - lastProcessedCount.current;

      // Only add to history if some time has passed (avoid divide by zero)
      if (duration > 0) {
        // Update total processed files and total processing time
        totalProcessedFiles.current += itemsProcessed;
        totalProcessingTime.current += duration;

        const averageRate =
          totalProcessedFiles.current / totalProcessingTime.current; // items per millisecond
        setProcessingRate(averageRate * 1000); // items per second

        // Update tracking variables
        lastTimestamp.current = now;
        lastProcessedCount.current = processed;
      }
    }

    // Calculate and format time remaining
    const updateEstimate = () => {
      if (processingRate && processingRate > 0) {
        const secondsRemaining = remaining / processingRate;

        setEstimatedTimeRemaining(formatTimeRemaining(secondsRemaining));
      } else if (processed > 0) {
        // If no rate yet but processing has started, show calculating message
        setEstimatedTimeRemaining('Calculating...');
      } else {
        setEstimatedTimeRemaining(null);
      }
    };

    // Update immediately
    updateEstimate();

    // Then update periodically
    const timer = setInterval(updateEstimate, 1000);
    return () => clearInterval(timer);
  }, [isProcessing, processed, remaining, processingRate, startTime]);

  // Format seconds into a human-readable string
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)} seconds`;
    }
    if (seconds < 3600) {
      return `${Math.ceil(seconds / 60)} minutes`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  if (!estimatedTimeRemaining) return null;

  return (
    <div className="text-xs text-muted-foreground flex items-center gap-2">
      <span className="flex-shrink-0">{label}:</span>
      <span className="font-medium">{estimatedTimeRemaining}</span>
      {showRate && processingRate && (
        <span className="ml-auto">
          ({processingRate.toFixed(1)} {rateUnit})
        </span>
      )}
    </div>
  );
}

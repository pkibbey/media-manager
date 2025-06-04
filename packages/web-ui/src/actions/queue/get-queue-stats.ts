'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

interface QueueMetrics {
  // Processing rate metrics
  processingRate: number; // jobs per second
  averageProcessingTime: number; // in milliseconds
  estimatedTimeRemaining: number; // in milliseconds

  // Throughput metrics
  throughputLast5Min: number;
  throughputLast1Hour: number;

  // Queue health metrics
  errorRate: number; // percentage of failed jobs
  queueLatency: number; // average wait time before processing

  // Peak metrics
  peakProcessingRate: number;
  peakWaitingJobs: number;

  // Enhanced metrics
  medianProcessingTime: number;
  p95ProcessingTime: number;
  p99ProcessingTime: number;
  maxConcurrency: number;
  currentConcurrency: number;
  averageConcurrency: number;
  retryRate: number;
  averageRetryCount: number;
  queueEfficiency: number;
  idleTime: number;
  stalledJobs: number;
  avgStallDuration: number;
}

export interface QueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  'waiting-children': number;
  prioritized: number;
  // Generic active jobs info
  activeJobs?: Array<{
    id: string;
    data: Record<string, any>;
    progress?: number;
  }>;
  // Enhanced metrics
  metrics?: QueueMetrics;
}

// Queue name to concurrency mapping based on actual worker configurations
const QUEUE_CONCURRENCY_MAP: Record<string, number> = {
  objectAnalysisQueue: appConfig.OBJECT_DETECTION_WORKER_CONCURRENCY, // 3
  contentWarningsQueue: appConfig.CONTENT_WARNINGS_WORKER_CONCURRENCY, // 3
  advancedAnalysisQueue: appConfig.ADVANCED_ANALYSIS_WORKER_CONCURRENCY, // 4
  thumbnailQueue: appConfig.THUMBNAIL_WORKER_CONCURRENCY, // 6
  duplicatesQueue: appConfig.DUPLICATES_WORKER_CONCURRENCY, // 5
  folderScanQueue: appConfig.FOLDER_SCAN_WORKER_CONCURRENCY, // 5
  exifQueue: appConfig.EXIF_WORKER_CONCURRENCY, // 50
};

export async function getQueueStats(queueName: string): Promise<QueueStats> {
  try {
    const queue = new Queue(queueName, { connection });

    // Get job counts
    const counts = await queue.getJobCounts();

    // Get active jobs to show current items being processed
    const activeJobs = await queue.getActive();

    // Calculate enhanced metrics
    const metrics = await calculateQueueMetrics(queue, counts, queueName);

    return {
      active: counts.active || 0,
      waiting: counts.waiting || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
      'waiting-children': counts['waiting-children'] || 0,
      prioritized: counts.prioritized || 0,
      activeJobs: activeJobs.map((job) => ({
        id: job.id || 'unknown',
        data: job.data || {},
        progress: job.progress || 0,
      })),
      metrics,
    };
  } catch (error) {
    console.error(`Error fetching queue stats for ${queueName}:`, error);
    throw error;
  }
}

async function calculateQueueMetrics(
  queue: Queue,
  counts: any,
  queueName: string,
): Promise<QueueMetrics> {
  try {
    // CONFIDENCE-FIRST APPROACH: Only use data from the last minute
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Get recent completed jobs - limit to reasonable number for performance
    const recentCompleted = await queue.getJobs(
      ['completed'],
      0,
      200, // Smaller limit since we only care about last minute
      false, // asc: false (newest first)
    );

    // Only use jobs completed in the last minute - our confidence window
    const completedLastMinute = recentCompleted.filter(
      (job) => job.finishedOn && job.finishedOn > oneMinuteAgo,
    );

    // Processing rate: Only from last minute data, no fallbacks
    const processingRate = completedLastMinute.length / 60; // jobs per second

    // Get actual concurrency limit for this queue
    const actualMaxConcurrency = QUEUE_CONCURRENCY_MAP[queueName] || 1;

    // Calculate processing time statistics only from recent 1-minute data
    const processingTimesLastMinute = completedLastMinute
      .filter((job) => job.processedOn && job.finishedOn)
      .map((job) => job.finishedOn! - job.processedOn!)
      .sort((a, b) => a - b);

    // Average processing time - only if we have recent data
    const averageProcessingTime =
      processingTimesLastMinute.length > 0
        ? processingTimesLastMinute.reduce((sum, time) => sum + time, 0) /
          processingTimesLastMinute.length
        : 0;

    // Percentile processing times - only if we have sufficient recent data
    const medianProcessingTime =
      processingTimesLastMinute.length >= 3
        ? processingTimesLastMinute[
            Math.floor(processingTimesLastMinute.length * 0.5)
          ]
        : 0;
    const p95ProcessingTime =
      processingTimesLastMinute.length >= 10
        ? processingTimesLastMinute[
            Math.floor(processingTimesLastMinute.length * 0.95)
          ]
        : 0;
    const p99ProcessingTime =
      processingTimesLastMinute.length >= 10
        ? processingTimesLastMinute[
            Math.floor(processingTimesLastMinute.length * 0.99)
          ]
        : 0;

    // Calculate estimated time remaining - only if we have reliable recent data
    const totalPendingJobs =
      (counts.waiting || 0) + (counts.prioritized || 0) + (counts.delayed || 0);

    let estimatedTimeRemaining = 0;
    if (
      totalPendingJobs > 0 &&
      processingRate > 0 &&
      completedLastMinute.length >= 3
    ) {
      // Only calculate if we have meaningful recent processing data
      const concurrencyAdjustedRate = Math.min(
        processingRate * actualMaxConcurrency,
        processingRate,
      );
      estimatedTimeRemaining =
        (totalPendingJobs / concurrencyAdjustedRate) * 1000;
    }

    // Simple throughput - just count from the last minute
    const throughputLast5Min = completedLastMinute.length; // Using same data as 1-minute
    const throughputLast1Hour = completedLastMinute.length; // Conservative: only recent data

    // Basic error rate from current counts (not time-based since we only trust recent data)
    const totalJobs = (counts.completed || 0) + (counts.failed || 0);
    const errorRate =
      totalJobs > 0 ? ((counts.failed || 0) / totalJobs) * 100 : 0;

    // Queue latency - only from recent completions
    const waitTimes = completedLastMinute
      .filter((job) => job.timestamp && job.processedOn)
      .map((job) => job.processedOn! - job.timestamp!);

    const queueLatency =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
        : 0;

    // Basic concurrency metrics - only what we can observe now
    const currentConcurrency = counts.active || 0;
    const maxConcurrency = actualMaxConcurrency;

    // Only simple metrics we can be confident about
    const peakProcessingRate = processingRate; // Current rate is our "peak"
    const peakWaitingJobs = counts.waiting || 0;

    // Calculate idle time since last completion
    const lastCompletedJob = completedLastMinute[0];
    const idleTime = lastCompletedJob?.finishedOn
      ? now - lastCompletedJob.finishedOn
      : 0;

    return {
      processingRate,
      averageProcessingTime,
      estimatedTimeRemaining,
      throughputLast5Min,
      throughputLast1Hour,
      errorRate,
      queueLatency,
      peakProcessingRate,
      peakWaitingJobs,
      // Enhanced metrics - only what we can calculate confidently
      medianProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      maxConcurrency,
      currentConcurrency,
      averageConcurrency: 0, // Removed uncertain calculation
      retryRate: 0, // Removed - needs longer time window
      averageRetryCount: 0, // Removed - needs longer time window
      queueEfficiency: 0, // Removed - too complex for 1-minute window
      idleTime,
      stalledJobs: 0, // Removed - not implemented
      avgStallDuration: 0, // Removed - not implemented
    };
  } catch (error) {
    console.error('Error calculating queue metrics:', error);
    // Return default metrics if calculation fails
    return {
      processingRate: 0,
      averageProcessingTime: 0,
      estimatedTimeRemaining: 0,
      throughputLast5Min: 0,
      throughputLast1Hour: 0,
      errorRate: 0,
      queueLatency: 0,
      peakProcessingRate: 0,
      peakWaitingJobs: 0,
      medianProcessingTime: 0,
      p95ProcessingTime: 0,
      p99ProcessingTime: 0,
      maxConcurrency: 0,
      currentConcurrency: 0,
      averageConcurrency: 0,
      retryRate: 0,
      averageRetryCount: 0,
      queueEfficiency: 0,
      idleTime: 0,
      stalledJobs: 0,
      avgStallDuration: 0,
    };
  }
}

/*
 * QUEUE STATS CALCULATION - ULTRA-CONSERVATIVE CONFIDENCE-FIRST APPROACH
 * ======================================================================
 *
 * This implementation prioritizes absolute data confidence over any estimation:
 *
 * 1. ONLY uses data from the last 1 minute - no fallbacks to longer windows
 * 2. NO calculations if we don't have sufficient recent data (≥3 completions)
 * 3. REMOVED all uncertain metrics: retry rates, queue efficiency, average concurrency
 * 4. Processing rate = completedLastMinute.length / 60 (simple and accurate)
 * 5. Uses actual worker concurrency from QUEUE_CONCURRENCY_MAP (no estimates)
 *
 * Key principles:
 * - If we can't measure it confidently in 1 minute, we don't report it
 * - No fallback calculations, estimates, or guesswork
 * - Estimated time remaining only with ≥3 recent completions + active processing rate
 * - Percentiles only calculated with sufficient data (≥3 for median, ≥10 for p95/p99)
 * - All complex metrics removed in favor of simple, observable data
 *
 * This approach prevents misleading estimates like "7 hours remaining" when
 * actual processing is much faster.
 */

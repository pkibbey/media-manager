'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import type { QueueMetrics, QueueStats } from 'shared/types';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

// Queue name to concurrency mapping based on actual worker configurations
const QUEUE_CONCURRENCY_MAP: Record<string, number> = {
  objectAnalysisQueue: appConfig.OBJECT_DETECTION_WORKER_CONCURRENCY, // 3
  contentWarningsQueue: appConfig.CONTENT_WARNINGS_WORKER_CONCURRENCY, // 3
  advancedAnalysisQueue: appConfig.ADVANCED_ANALYSIS_WORKER_CONCURRENCY, // 4
  thumbnailQueue: appConfig.THUMBNAIL_WORKER_CONCURRENCY, // 6
  duplicatesQueue: appConfig.DUPLICATES_WORKER_CONCURRENCY, // 5
  folderScanQueue: appConfig.FOLDER_SCAN_WORKER_CONCURRENCY, // 5
  exifQueue: appConfig.EXIF_WORKER_CONCURRENCY, // 50
  fixImageDatesQueue: appConfig.FIX_IMAGE_DATES_WORKER_CONCURRENCY, // 5
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

    // Median processing time (ms)
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

    // Basic concurrency metrics - only what we can observe now
    const currentConcurrency = counts.active || 0;
    const maxConcurrency = actualMaxConcurrency;

    // --- FIX: Processing Rate Calculation ---
    // Use a new variable for the fixed logic to avoid redeclaration
    let processingRate: number;
    if (medianProcessingTime > 0 && currentConcurrency > 0) {
      processingRate = (currentConcurrency * 1000) / medianProcessingTime;
    } else {
      processingRate = completedLastMinute.length / 60;
    }

    // Calculate idle time since last completion
    const lastCompletedJob = completedLastMinute[0];
    const idleTime = lastCompletedJob?.finishedOn
      ? now - lastCompletedJob.finishedOn
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

    return {
      processingRate,
      averageProcessingTime,
      estimatedTimeRemaining,
      throughputLast5Min,
      throughputLast1Hour,
      errorRate,
      queueLatency,
      // Enhanced metrics - only what we can calculate confidently
      medianProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      maxConcurrency,
      currentConcurrency,
      idleTime,
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
      medianProcessingTime: 0,
      p95ProcessingTime: 0,
      p99ProcessingTime: 0,
      maxConcurrency: 0,
      currentConcurrency: 0,
      idleTime: 0,
    };
  }
}

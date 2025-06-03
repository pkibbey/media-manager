'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

export interface QueueMetrics {
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

export async function getQueueStats(queueName: string): Promise<QueueStats> {
  try {
    const queue = new Queue(queueName, { connection });

    // Get job counts
    const counts = await queue.getJobCounts();

    // Get active jobs to show current items being processed
    const activeJobs = await queue.getActive();

    // Calculate enhanced metrics
    const metrics = await calculateQueueMetrics(queue, counts);

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
): Promise<QueueMetrics> {
  try {
    // Get completed jobs from the last hour for metrics calculation
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Get recent completed jobs to calculate processing metrics
    const recentCompleted = await queue.getJobs(
      ['completed'],
      0,
      200, // Increased sample size for better metrics
      true, // asc: false (newest first)
    );

    // Get failed jobs for retry analysis
    const recentFailed = await queue.getJobs(['failed'], 0, 100, true);

    // Filter jobs by time range
    const completedLast5Min = recentCompleted.filter(
      (job) => job.finishedOn && job.finishedOn > fiveMinutesAgo,
    );
    const completedLastHour = recentCompleted.filter(
      (job) => job.finishedOn && job.finishedOn > oneHourAgo,
    );
    const failedLastHour = recentFailed.filter(
      (job) => job.finishedOn && job.finishedOn > oneHourAgo,
    );

    // Calculate processing rate (jobs per second) with fallback strategies
    let processingRate = completedLast5Min.length / (5 * 60); // jobs per second from last 5 min

    // Fallback 1: If no jobs completed in 5 min, use 1 hour data
    if (processingRate === 0 && completedLastHour.length > 0) {
      processingRate = completedLastHour.length / (60 * 60); // jobs per second from last hour
    }

    // Fallback 2: If still no rate, estimate from active jobs and average processing time
    let fallbackProcessingRate = 0;
    if (processingRate === 0 && counts.active > 0) {
      // Use all available completed jobs to estimate average processing time
      const allProcessingTimes = recentCompleted
        .filter((job) => job.processedOn && job.finishedOn)
        .map((job) => job.finishedOn! - job.processedOn!);

      if (allProcessingTimes.length > 0) {
        const avgProcessingTimeMs =
          allProcessingTimes.reduce((sum, time) => sum + time, 0) /
          allProcessingTimes.length;
        // Estimate rate: if we have N active jobs and average processing time,
        // we can process roughly N jobs per avgProcessingTime
        fallbackProcessingRate = (counts.active / avgProcessingTimeMs) * 1000; // convert to jobs per second
      }
    }

    // Use the best available processing rate
    const effectiveProcessingRate =
      processingRate > 0 ? processingRate : fallbackProcessingRate;

    // Calculate processing time statistics
    const processingTimes = completedLastHour
      .filter((job) => job.processedOn && job.finishedOn)
      .map((job) => job.finishedOn! - job.processedOn!)
      .sort((a, b) => a - b);

    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) /
          processingTimes.length
        : 0;

    // Calculate percentile processing times
    const medianProcessingTime =
      processingTimes.length > 0
        ? processingTimes[Math.floor(processingTimes.length * 0.5)]
        : 0;
    const p95ProcessingTime =
      processingTimes.length > 0
        ? processingTimes[Math.floor(processingTimes.length * 0.95)]
        : 0;
    const p99ProcessingTime =
      processingTimes.length > 0
        ? processingTimes[Math.floor(processingTimes.length * 0.99)]
        : 0;

    // Calculate estimated time remaining with improved logic
    const totalPendingJobs =
      (counts.waiting || 0) + (counts.prioritized || 0) + (counts.delayed || 0);

    let estimatedTimeRemaining = 0;
    if (totalPendingJobs > 0) {
      if (effectiveProcessingRate > 0) {
        // Use processing rate to estimate
        estimatedTimeRemaining =
          (totalPendingJobs / effectiveProcessingRate) * 1000; // convert to milliseconds
      } else if (averageProcessingTime > 0 && counts.active === 0) {
        // If no active jobs but we know average processing time, estimate sequentially
        estimatedTimeRemaining = totalPendingJobs * averageProcessingTime;
      } else if (averageProcessingTime > 0 && counts.active > 0) {
        // If jobs are active, estimate based on concurrency
        const estimatedConcurrency = Math.max(counts.active, 1);
        estimatedTimeRemaining =
          (totalPendingJobs / estimatedConcurrency) * averageProcessingTime;
      }
    }

    // Debug logging for estimation issues
    if (process.env.NODE_ENV === 'development') {
      console.debug('Queue metrics debug:', {
        queueName: queue.name,
        completedLast5Min: completedLast5Min.length,
        completedLastHour: completedLastHour.length,
        processingRate,
        fallbackProcessingRate,
        effectiveProcessingRate,
        totalPendingJobs,
        activeJobs: counts.active,
        averageProcessingTime,
        estimatedTimeRemaining,
      });
    }

    // Calculate throughput metrics
    const throughputLast5Min = completedLast5Min.length;
    const throughputLast1Hour = completedLastHour.length;

    // Calculate error rate
    const totalRecentJobs = (counts.completed || 0) + (counts.failed || 0);
    const errorRate =
      totalRecentJobs > 0 ? ((counts.failed || 0) / totalRecentJobs) * 100 : 0;

    // Calculate retry metrics
    const jobsWithRetries = failedLastHour.filter(
      (job) => (job.attemptsMade || 0) > 1,
    );
    const retryRate =
      failedLastHour.length > 0
        ? (jobsWithRetries.length / failedLastHour.length) * 100
        : 0;
    const averageRetryCount =
      jobsWithRetries.length > 0
        ? jobsWithRetries.reduce(
            (sum, job) => sum + (job.attemptsMade || 0),
            0,
          ) / jobsWithRetries.length
        : 0;

    // Calculate queue latency (average wait time)
    const waitTimes = completedLastHour
      .filter((job) => job.timestamp && job.processedOn)
      .map((job) => job.processedOn! - job.timestamp!);

    const queueLatency =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
        : 0;

    // Calculate queue efficiency (processing time vs total time)
    const totalTimes = completedLastHour
      .filter((job) => job.timestamp && job.finishedOn && job.processedOn)
      .map((job) => ({
        processing: job.finishedOn! - job.processedOn!,
        total: job.finishedOn! - job.timestamp!,
      }));

    const queueEfficiency =
      totalTimes.length > 0
        ? (totalTimes.reduce((sum, times) => sum + times.processing, 0) /
            totalTimes.reduce((sum, times) => sum + times.total, 0)) *
          100
        : 0;

    // Calculate concurrency metrics
    const currentConcurrency = counts.active || 0;
    const maxConcurrency = Math.max(currentConcurrency, 10); // Could be enhanced with historical tracking
    const averageConcurrency = currentConcurrency; // Simplified - could track over time

    // Get stalled jobs count from queue counts (if available)
    let stalledJobs = 0;
    let avgStallDuration = 0;
    try {
      // Note: Stall detection would need to be implemented through active job monitoring
      // For now, we'll use a simplified approach
      stalledJobs = 0; // Could be enhanced with custom stall detection logic
      avgStallDuration = 0;
    } catch (error) {
      console.debug('Stall detection not implemented:', error);
    }

    // Get peak metrics from recent history
    const peakProcessingRate = Math.max(effectiveProcessingRate, 0);
    const peakWaitingJobs = Math.max(
      counts.waiting || 0,
      counts.prioritized || 0,
    );

    // Calculate idle time (simplified - time since last job completion)
    const lastCompletedJob = completedLast5Min[0];
    const idleTime = lastCompletedJob?.finishedOn
      ? now - lastCompletedJob.finishedOn
      : 0;

    return {
      processingRate: effectiveProcessingRate,
      averageProcessingTime,
      estimatedTimeRemaining,
      throughputLast5Min,
      throughputLast1Hour,
      errorRate,
      queueLatency,
      peakProcessingRate,
      peakWaitingJobs,
      // Enhanced metrics
      medianProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      maxConcurrency,
      currentConcurrency,
      averageConcurrency,
      retryRate,
      averageRetryCount,
      queueEfficiency,
      idleTime,
      stalledJobs,
      avgStallDuration,
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

/**
 * Union type of all valid queue names in the media manager system.
 * This ensures type safety when working with queue operations.
 */
export type QueueName =
  | 'folderScanQueue'
  | 'advancedAnalysisQueue'
  | 'duplicatesQueue'
  | 'contentWarningsQueue'
  | 'thumbnailQueue'
  | 'exifQueue'
  | 'objectAnalysisQueue';

/**
 * Valid BullMQ job states that can be used for queue operations.
 */
export type QueueState =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'waiting-children'
  | 'prioritized';

/**
 * Queue configuration object for mapping queue names to their actions and display names.
 */
export interface QueueConfig {
  action: () => Promise<boolean>;
  name: string;
}

/**
 * Enhanced queue metrics for monitoring processing performance.
 */
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

  // New enhanced metrics
  // Memory and performance
  memoryUsage?: number; // bytes
  cpuUsage?: number; // percentage

  // Advanced timing metrics
  medianProcessingTime: number; // milliseconds
  p95ProcessingTime: number; // 95th percentile processing time
  p99ProcessingTime: number; // 99th percentile processing time

  // Concurrency metrics
  maxConcurrency: number; // maximum concurrent jobs
  currentConcurrency: number; // current active jobs
  averageConcurrency: number; // average over last hour

  // Retry and failure analysis
  retryRate: number; // percentage of jobs that needed retries
  averageRetryCount: number; // average retries per failed job

  // Queue efficiency
  queueEfficiency: number; // percentage (processing time / total time)
  idleTime: number; // milliseconds queue was idle

  // Stall detection
  stalledJobs: number; // count of stalled jobs
  avgStallDuration: number; // average stall duration in ms

  // Historical trends (optional for trending graphs)
  trends?: {
    processingRateHistory: number[]; // last 10 data points
    errorRateHistory: number[]; // last 10 data points
    queueSizeHistory: number[]; // last 10 data points
  };
}

/**
 * Statistics for a queue including job counts and active jobs.
 */
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

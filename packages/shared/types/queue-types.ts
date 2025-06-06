import type { ProcessType } from './media-types';

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
  | 'objectAnalysisQueue'
  | 'fixImageDatesQueue'
  | 'blurryPhotosQueue';

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
  action: (method: ProcessType) => Promise<boolean>;
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

  // Queue health metrics
  errorRate: number; // percentage of failed jobs
  queueLatency: number; // average wait time before processing
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

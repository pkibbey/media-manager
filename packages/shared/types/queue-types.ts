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
}

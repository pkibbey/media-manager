'use server';

import { type QueueStats, getQueueStats } from '../queue/get-queue-stats';

export interface DuplicatesQueueStats extends QueueStats {
  // Override activeJobs to be more specific for duplicates jobs
  activeJobs?: Array<{
    id: string;
    data: {
      id: string;
      visual_hash: string;
    };
    progress?: number;
  }>;
}

export async function getDuplicatesQueueStats(): Promise<DuplicatesQueueStats> {
  return getQueueStats('duplicatesQueue') as Promise<DuplicatesQueueStats>;
}

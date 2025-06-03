'use server';

import { type QueueStats, getQueueStats } from '../queue/get-queue-stats';

export interface ContentWarningsQueueStats extends QueueStats {
  // Override activeJobs to be more specific for content warnings jobs
  activeJobs?: Array<{
    id: string;
    data: {
      id: string;
      thumbnail_url: string;
    };
    progress?: number;
  }>;
}

export async function getContentWarningsQueueStats(): Promise<ContentWarningsQueueStats> {
  return getQueueStats(
    'contentWarningsQueue',
  ) as Promise<ContentWarningsQueueStats>;
}

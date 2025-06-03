'use server';

import type { QueueStats } from 'shared/types';
import { getQueueStats } from '../queue/get-queue-stats';

export interface ThumbnailQueueStats extends QueueStats {
  // Override activeJobs to be more specific for thumbnail jobs
  activeJobs?: Array<{
    id: string;
    data: {
      id: string;
      media_path: string;
    };
    progress?: number;
  }>;
}

export async function getThumbnailQueueStats(): Promise<ThumbnailQueueStats> {
  return getQueueStats('thumbnailQueue') as Promise<ThumbnailQueueStats>;
}

'use server';

import type { QueueStats } from 'shared/types';
import { getQueueStats } from '../queue/get-queue-stats';

interface BlurryPhotosQueueStats extends QueueStats {
  // Override activeJobs to be more specific for blurry photos jobs
  activeJobs?: Array<{
    id: string;
    data: {
      id: string;
      media_path: string;
      thumbnail_url: string;
    };
    progress?: number;
  }>;
}

export async function getBlurryPhotosQueueStats(): Promise<BlurryPhotosQueueStats> {
  return getQueueStats('blurryPhotosQueue') as Promise<BlurryPhotosQueueStats>;
}

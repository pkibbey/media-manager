'use server';

import type { QueueStats } from 'shared/types';
import { getQueueStats } from '../queue/get-queue-stats';

interface VisualHashQueueStats extends QueueStats {
  // Override activeJobs to be more specific for visual hash jobs
  activeJobs?: Array<{
    id: string;
    data: {
      id: string;
      thumbnail_url: string;
    };
    progress?: number;
  }>;
}

export async function getVisualHashQueueStats(): Promise<VisualHashQueueStats> {
  return getQueueStats('visualHashQueue') as Promise<VisualHashQueueStats>;
}

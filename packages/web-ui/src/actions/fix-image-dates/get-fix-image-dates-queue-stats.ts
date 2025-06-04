'use server';

import type { QueueStats } from 'shared/types';
import { getQueueStats } from '../queue/get-queue-stats';

interface FixImageDatesQueueStats extends QueueStats {
  // Override activeJobs to be more specific for fix image dates jobs
  activeJobs?: Array<{
    id: string;
    data: {
      id: string;
      media_path: string;
    };
    progress?: number;
  }>;
}

export async function getFixImageDatesQueueStats(): Promise<FixImageDatesQueueStats> {
  return getQueueStats(
    'fixImageDatesQueue',
  ) as Promise<FixImageDatesQueueStats>;
}

'use server';

import { type QueueStats, getQueueStats } from '../queue/get-queue-stats';

export interface FolderScanQueueStats extends QueueStats {
  // Override activeJobs to be more specific for folder scan jobs
  activeJobs?: Array<{
    id: string;
    data: {
      folderPath: string;
    };
    progress?: number;
  }>;
}

export async function getFolderScanQueueStats(): Promise<FolderScanQueueStats> {
  return getQueueStats('folderScanQueue') as Promise<FolderScanQueueStats>;
}

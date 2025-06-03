'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
  {
    maxRetriesPerRequest: null,
  },
);

const folderScanQueue = new Queue('folderScanQueue', { connection });

export interface FolderScanQueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  'waiting-children': number;
  prioritized: number;
  // Additional info for active jobs
  activeJobs?: Array<{
    id: string;
    data: {
      folderPath: string;
    };
    progress?: number;
  }>;
}

export async function getFolderScanQueueStats(): Promise<FolderScanQueueStats> {
  try {
    // Get job counts
    const counts = await folderScanQueue.getJobCounts();

    // Get active jobs to show current folders being processed
    const activeJobs = await folderScanQueue.getActive();

    return {
      active: counts.active || 0,
      waiting: counts.waiting || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
      'waiting-children': counts['waiting-children'] || 0,
      prioritized: counts.prioritized || 0,
      activeJobs: activeJobs.map((job) => ({
        id: job.id || 'unknown',
        data: {
          folderPath: job.data?.folderPath || 'unknown',
        },
        progress: job.progress || 0,
      })),
    };
  } catch (error) {
    console.error('Error fetching folder scan queue stats:', error);
    // Return empty stats on error
    return {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      'waiting-children': 0,
      prioritized: 0,
      activeJobs: [],
    };
  }
}

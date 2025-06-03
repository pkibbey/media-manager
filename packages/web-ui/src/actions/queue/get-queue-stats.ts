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

export async function getQueueStats(queueName: string): Promise<QueueStats> {
  try {
    const queue = new Queue(queueName, { connection });

    // Get job counts
    const counts = await queue.getJobCounts();

    // Get active jobs to show current items being processed
    const activeJobs = await queue.getActive();

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
        data: job.data || {},
        progress: job.progress || 0,
      })),
    };
  } catch (error) {
    console.error(`Error fetching queue stats for ${queueName}:`, error);
    throw error;
  }
}

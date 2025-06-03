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

export async function resetFolderScanData() {
  try {
    // Clean all jobs from the queue
    await folderScanQueue.clean(0, 1000000, 'completed');
    await folderScanQueue.clean(0, 1000000, 'failed');
    await folderScanQueue.clean(0, 1000000, 'wait');
    await folderScanQueue.clean(0, 1000000, 'delayed');
    await folderScanQueue.clean(0, 1000000, 'paused');

    console.log('Successfully reset folder scan queue data');
    return true;
  } catch (error) {
    console.error('Error resetting folder scan data:', error);
    return false;
  }
}

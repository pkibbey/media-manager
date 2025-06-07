'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

const folderScanQueue = new Queue('folderScanQueue', { connection });

export async function addFoldersToScanQueue(folderPaths: string[]) {
  try {
    if (!folderPaths || folderPaths.length === 0) {
      return { success: false, error: 'No folder paths provided' };
    }

    // Filter out empty paths and normalize
    const validPaths = folderPaths
      .map((path) => path.trim())
      .filter((path) => path.length > 0)
      .map((path) => path.replace(/\/$/, '')); // Remove trailing slash

    if (validPaths.length === 0) {
      return { success: false, error: 'No valid folder paths provided' };
    }

    // Add each folder as a separate job with randomized priority for cross-drive distribution
    const jobs = validPaths.map((folderPath) => ({
      name: 'folder-scan',
      data: {
        folderPath,
        method: 'standard',
      },
      opts: {
        jobId: `folder-scan-${folderPath}`,
        // Add random priority to distribute across drives (higher number = higher priority)
        // Using a range that ensures good distribution while keeping initial folders high priority
        priority: Math.floor(Math.random() * 100) + 900, // Priority range: 900-999
      },
    }));

    await folderScanQueue.addBulk(jobs);

    console.log(
      'Added',
      jobs.length,
      'folder scan jobs to the queue for processing',
    );

    return {
      success: true,
      foldersAdded: jobs.length,
    };
  } catch (error) {
    console.error('Error adding folders to scan queue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

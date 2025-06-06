import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import { appConfig } from 'shared/env';
import { createRedisConnection } from 'shared/redis';
import { processFolderScan } from './process-folder-scan';

interface FolderScanJobData {
  folderPath: string;
}

const redisConnection = createRedisConnection();

const QUEUE_NAME = 'folderScanQueue';

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<FolderScanJobData>,
): Promise<boolean> => {
  const { folderPath } = job.data;

  try {
    // Process folder scan using the extracted function
    return await processFolderScan({ folderPath });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Worker] Error processing job ${job.id} for folder ${folderPath}:`,
      errorMessage,
    );
    throw error; // Rethrow to allow BullMQ to handle retries/failures
  }
};

// Create and start the worker
const worker = new Worker<FolderScanJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.FOLDER_SCAN_WORKER_CONCURRENCY,
});

worker.on('completed', (job: Job<FolderScanJobData>) => {
  console.log(
    `[Worker] Job ${job.id} (Folder: ${job.data.folderPath}) completed folder scan.`,
  );
});

worker.on('failed', (job: Job<FolderScanJobData> | undefined, err: Error) => {
  console.error(
    `[Worker] Job ${job?.id} (Folder: ${job?.data.folderPath}) failed with error: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(`Folder scan worker started. Listening to queue: ${QUEUE_NAME}`);

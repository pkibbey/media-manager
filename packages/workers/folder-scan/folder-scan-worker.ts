import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import { processFolderScan } from './process-folder-scan';

interface FolderScanJobData {
  folderPath: string;
  method: 'standard';
}

const redisConnection = new IORedis(
  appConfig.REDIS_PORT,
  serverEnv.REDIS_HOST,
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const QUEUE_NAME = 'folderScanQueue';

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<FolderScanJobData>,
): Promise<boolean> => {
  const { folderPath, method } = job.data;

  try {
    // Process folder scan based on the specified method
    let result: boolean;

    switch (method) {
      case 'standard':
        result = await processFolderScan({ folderPath });
        break;
      default:
        throw new Error(`Unknown folder scan processing method: ${method}`);
    }

    if (result) {
      return true;
    }

    throw new Error(`Failed to process folder scan using ${method} method`);
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

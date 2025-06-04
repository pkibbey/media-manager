import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import { processExifFast } from './process-exif-fast';
// import { processExifSlow } from './process-exif-slow';

interface ExifJobData {
  id: string;
  media_path: string;
  media_types?: {
    is_ignored: boolean;
  };
}

const redisConnection = new IORedis(
  appConfig.REDIS_PORT,
  serverEnv.REDIS_HOST,
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const QUEUE_NAME = 'exifQueue';

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (job: Job<ExifJobData>): Promise<boolean> => {
  const { id, media_path } = job.data;

  try {
    // Process the EXIF metadata using the selected processor
    const fastResult = await processExifFast({ id, media_path });

    if (fastResult) {
      return true;
    }

    // No need to process with slow method if fast method succeeded
    // Uncomment the following lines if you want to fall back to the slow method
    // const slowResult = await processExifSlow({ id, media_path });

    // if (slowResult) {
    //   return true;
    // }

    console.warn(
      `No EXIF data found for media ID ${id}. Skipping EXIF processing.`,
    );
    return false;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Worker] Error processing job ${job.id} for media ID ${id}:`,
      errorMessage,
    );
    throw error; // Rethrow to allow BullMQ to handle retries/failures
  }
};

// Create and start the worker
const worker = new Worker<ExifJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.EXIF_WORKER_CONCURRENCY,
});

worker.on('completed', (job: Job<ExifJobData>) => {
  console.log(`[Worker] Job ${job.id} completed EXIF processing.`);
});

worker.on('failed', (job: Job<ExifJobData> | undefined, err: Error) => {
  console.error(
    `[Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(
  `EXIF processing worker started. Listening to queue: ${QUEUE_NAME}`,
);

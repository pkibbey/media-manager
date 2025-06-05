import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import type { ExifProcessingMethod } from '../../web-ui/src/actions/media/add-media-to-exif-queue';
import { processExifFast } from './process-exif-fast';
import { processExifSlow } from './process-exif-slow';

interface ExifJobData {
  id: string;
  media_path: string;
  method: ExifProcessingMethod;
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
  const { id, media_path, method } = job.data;
  console.log('method: ', method);

  try {
    // Process the EXIF metadata based on the specified method
    let result: boolean;

    switch (method) {
      case 'fast':
        result = await processExifFast({ id, media_path }, method);
        break;
      case 'slow':
        result = await processExifSlow({ id, media_path }, method);
        break;
      default:
        throw new Error(`Unknown EXIF processing method: ${method}`);
    }

    if (result) {
      console.log(
        `[Worker] Successfully processed ${method} EXIF for media ID: ${id}`,
      );
      return true;
    }

    console.warn(
      `No EXIF data found for media ID ${id} using ${method} method. Skipping EXIF processing.`,
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

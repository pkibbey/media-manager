import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import { processBlurryPhoto } from './process-blurry-photo';

export type BlurryPhotosMethod = 'standard' | 'auto-delete';

interface BlurryPhotosJobData {
  id: string;
  media_path: string;
  thumbnail_url: string;
  method: BlurryPhotosMethod;
}

const redisConnection = new IORedis(
  appConfig.REDIS_PORT,
  serverEnv.REDIS_HOST,
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const QUEUE_NAME = 'blurryPhotosQueue';

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<BlurryPhotosJobData>,
): Promise<boolean> => {
  const {
    id: mediaId,
    media_path: mediaPath,
    thumbnail_url: thumbnailUrl,
    method,
  } = job.data;

  try {
    // Process based on the specified method
    const result = await processBlurryPhoto({
      id: mediaId,
      media_path: mediaPath,
      thumbnail_url: thumbnailUrl,
      method,
    });

    if (!result.success) {
      throw new Error(
        result.error || `Failed to process blurry photo with ${method}`,
      );
    }

    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Worker] Error processing job ${job.id} for media ID ${mediaId}:`,
      errorMessage,
    );
    throw error; // Rethrow to allow BullMQ to handle retries/failures
  }
};

// Create and start the worker
const worker = new Worker<BlurryPhotosJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.BLURRY_PHOTOS_WORKER_CONCURRENCY,
});

worker.on('completed', (job: Job<BlurryPhotosJobData>) => {
  console.log(`[Worker] Job ${job.id} completed blurry photos processing.`);
});

worker.on('failed', (job: Job<BlurryPhotosJobData> | undefined, err: Error) => {
  console.error(
    `[Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(`Blurry photos worker started. Listening to queue: ${QUEUE_NAME}`);

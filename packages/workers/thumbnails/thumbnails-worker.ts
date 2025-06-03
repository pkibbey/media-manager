import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import {
  processThumbnailFast,
  processThumbnailUltra,
} from './process-thumbnail';

interface ThumbnailJobData {
  id: string;
  media_path: string;
}

const redisConnection = new IORedis(
  appConfig.REDIS_PORT,
  serverEnv.REDIS_HOST,
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const QUEUE_NAME = 'thumbnailQueue';

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<ThumbnailJobData>,
): Promise<boolean> => {
  const { id: mediaId, media_path: mediaPath } = job.data;

  try {
    if (!mediaPath) {
      throw new Error('No media path provided for thumbnail generation');
    }

    // Generate the thumbnail
    const result = await processThumbnailUltra({
      mediaId,
      mediaPath,
    });

    if (!result) {
      const fallback = await processThumbnailFast({
        mediaId,
        mediaPath,
      });

      if (!fallback) {
        throw new Error('Failed to generate thumbnail');
      }
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
const worker = new Worker<ThumbnailJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.THUMBNAIL_WORKER_CONCURRENCY,
});

worker.on('completed', (job: Job<ThumbnailJobData>) => {
  console.log(`[Worker] Job ${job.id} completed thumbnail generation.`);
});

worker.on('failed', (job: Job<ThumbnailJobData> | undefined, err: Error) => {
  console.error(
    `[Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(
  `Thumbnail generation worker started. Listening to queue: ${QUEUE_NAME}`,
);

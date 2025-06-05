import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import type { ThumbnailProcessingMethod } from '../../web-ui/src/actions/media/add-media-to-thumbnail-queue';
import { processThumbnailFast } from './process-thumbnail-fast';
import { processThumbnailSlow } from './process-thumbnail-slow';
import { processThumbnailUltra } from './process-thumbnail-ultra';

interface ThumbnailJobData {
  id: string;
  media_path: string;
  method: ThumbnailProcessingMethod;
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
  const { id: mediaId, media_path: mediaPath, method } = job.data;

  try {
    if (!mediaPath) {
      throw new Error('No media path provided for thumbnail generation');
    }

    // Generate the thumbnail based on the specified method
    let result: boolean;

    switch (method) {
      case 'ultra':
        result = await processThumbnailUltra({
          mediaId,
          mediaPath,
        });
        break;
      case 'fast':
        result = await processThumbnailFast({
          mediaId,
          mediaPath,
        });
        break;
      case 'slow':
        result = await processThumbnailSlow({
          mediaId,
          mediaPath,
        });
        break;
      default:
        throw new Error(`Unknown thumbnail processing method: ${method}`);
    }

    if (result) {
      console.log(
        `[Worker] Successfully generated ${method} thumbnail for media ID: ${mediaId}`,
      );
      return true;
    }

    throw new Error(`Failed to generate ${method} thumbnail`);
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

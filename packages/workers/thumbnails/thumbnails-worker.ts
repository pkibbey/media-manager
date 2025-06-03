import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processThumbnail } from './process-thumbnail';

interface ThumbnailJobData {
  id: string;
  media_path: string;
}

const redisConnection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
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

    // Process the thumbnail
    // The processThumbnail function handles thumbnail generation,
    // uploads to storage, and database updates
    const result = await processThumbnail({
      mediaId,
      mediaPath,
    });

    if (!result) {
      throw new Error('Failed to generate thumbnail');
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
  concurrency: Number.parseInt(process.env.THUMBNAIL_WORKER_CONCURRENCY || '1'),
});

worker.on('completed', (job: Job<ThumbnailJobData>) => {
  console.log(
    `[Worker] Job ${job.id} (Media ID: ${job.data.id}) completed thumbnail generation.`,
  );
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

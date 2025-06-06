import { type Job, Worker } from 'bullmq';
import { appConfig } from 'shared/env';
import { createRedisConnection } from 'shared/redis';

import { processVisualHash } from './process-visual-hash';

interface VisualHashJobData {
  id: string;
  thumbnail_url: string;
}

const redisConnection = createRedisConnection();

const QUEUE_NAME = 'visualHashQueue';

/**
 * The main worker processor function for visual hash generation.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<VisualHashJobData>,
): Promise<boolean> => {
  const { id: mediaId, thumbnail_url: thumbnailUrl } = job.data;

  try {
    if (!mediaId || !thumbnailUrl) {
      throw new Error(
        'mediaId and thumbnailUrl are required for visual hash generation',
      );
    }

    const result = await processVisualHash({ mediaId, thumbnailUrl });

    if (result) {
      return true;
    }

    throw new Error('Failed to process visual hash');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Visual Hash Worker] Error processing job ${job.id} for media ID ${mediaId}:`,
      errorMessage,
    );
    throw error; // Rethrow to allow BullMQ to handle retries/failures
  }
};

// Create and start the worker
const worker = new Worker<VisualHashJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.VISUAL_HASH_WORKER_CONCURRENCY,
});

worker.on('failed', (job: Job<VisualHashJobData> | undefined, err: Error) => {
  console.error(
    `[Visual Hash Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[Visual Hash Worker] Worker encountered an error:', err);
});

console.log(
  `Visual hash generation worker started. Listening to queue: ${QUEUE_NAME}`,
);

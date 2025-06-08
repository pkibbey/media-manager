import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import { processVisualHash } from './process-visual-hash';

interface VisualHashJobData {
  id: string;
  thumbnail_url: string;
  method: 'standard';
}

const redisConnection = new IORedis(
  appConfig.REDIS_PORT,
  serverEnv.REDIS_HOST,
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const QUEUE_NAME = 'visualHashQueue';

/**
 * The main worker processor function for visual hash generation.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<VisualHashJobData>,
): Promise<boolean> => {
  const { id: mediaId, thumbnail_url: thumbnailUrl, method } = job.data;

  try {
    console.log(
      `[Worker] Processing job ${job.id} for media ID ${mediaId} with thumbnail: ${thumbnailUrl}`,
    );

    if (!mediaId || !thumbnailUrl) {
      throw new Error(
        'mediaId and thumbnailUrl are required for visual hash generation',
      );
    }

    // Process the visual hash based on the specified method
    let result: boolean;

    switch (method) {
      case 'standard':
        result = await processVisualHash({ mediaId, thumbnailUrl });
        break;
      default:
        throw new Error(`Unknown visual hash processing method: ${method}`);
    }

    if (result) {
      return true;
    }

    throw new Error(`Failed to generate visual hash using ${method} method`);
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
const worker = new Worker<VisualHashJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.VISUAL_HASH_WORKER_CONCURRENCY,
});

worker.on('completed', (job: Job<VisualHashJobData>) => {
  console.log(`[Worker] Job ${job.id} completed visual hash processing.`);
});

worker.on('failed', (job: Job<VisualHashJobData> | undefined, err: Error) => {
  console.error(
    `[Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(
  `Visual hash processing worker started. Listening to queue: ${QUEUE_NAME}`,
);

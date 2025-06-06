import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import { processContentWarnings } from './process-warnings';

export type ContentWarningsMethod = 'standard';

interface ContentWarningsJobData {
  id: string;
  thumbnail_url: string;
  method: ContentWarningsMethod;
}

const redisConnection = new IORedis(
  appConfig.REDIS_PORT,
  serverEnv.REDIS_HOST,
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const QUEUE_NAME = 'contentWarningsQueue';

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<ContentWarningsJobData>,
): Promise<boolean> => {
  const { id: mediaId, thumbnail_url: thumbnailUrl, method } = job.data;

  try {
    // Process based on the specified method
    let result: boolean;

    switch (method) {
      case 'standard':
        result = await processContentWarnings({ mediaId, thumbnailUrl });
        break;
      default:
        throw new Error(`Unknown content warnings method: ${method}`);
    }

    if (result) {
      return true;
    }

    throw new Error(`Failed to process ${method} content warnings`);
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
const worker = new Worker<ContentWarningsJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.CONTENT_WARNINGS_WORKER_CONCURRENCY,
});

// worker.on('completed', (job: Job<ContentWarningsJobData>) => {
//   console.log(`[Worker] Job ${job.id} completed content warnings processing.`);
// });

worker.on(
  'failed',
  (job: Job<ContentWarningsJobData> | undefined, err: Error) => {
    console.error(
      `[Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
    );
  },
);

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(
  `Content warnings worker started. Listening to queue: ${QUEUE_NAME}`,
);

import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import { processFixImageDates } from './process-fix-image-dates';

interface FixImageDatesJobData {
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

const QUEUE_NAME = 'fixImageDatesQueue';

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<FixImageDatesJobData>,
): Promise<boolean> => {
  const { id: mediaId, media_path: mediaPath } = job.data;

  try {
    // Process the image date fixing using the extracted function
    const result = await processFixImageDates({ mediaId, mediaPath });

    // If no date could be found or processing failed, mark the job as failed
    if (!result) {
      throw new Error(
        `Failed to fix image date for media ${mediaId}: No date found in filename or processing failed`,
      );
    }

    return result;
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
const worker = new Worker<FixImageDatesJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.FIX_IMAGE_DATES_WORKER_CONCURRENCY,
});

worker.on('completed', (job: Job<FixImageDatesJobData>) => {
  console.log(`[Worker] Job ${job.id} completed fix image dates processing.`);
});

worker.on(
  'failed',
  (job: Job<FixImageDatesJobData> | undefined, err: Error) => {
    console.error(
      `[Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
    );
  },
);

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(
  `Fix image dates worker started. Listening to queue: ${QUEUE_NAME}`,
);

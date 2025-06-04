import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';
import { processObjectDetection } from './process-object-detection';

interface ObjectDetectionJobData {
  id: string;
  thumbnail_url: string;
}

const redisConnection = new IORedis(
  appConfig.REDIS_PORT,
  serverEnv.REDIS_HOST,
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const QUEUE_NAME = 'objectAnalysisQueue';

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<ObjectDetectionJobData>,
): Promise<boolean> => {
  const { id: mediaId, thumbnail_url: thumbnailUrl } = job.data;

  try {
    // Process object detection using the extracted function
    return await processObjectDetection({ mediaId, thumbnailUrl });
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
const worker = new Worker<ObjectDetectionJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.OBJECT_DETECTION_WORKER_CONCURRENCY,
});

worker.on('completed', (job: Job<ObjectDetectionJobData>) => {
  console.log(`[Worker] Job ${job.id} completed object detection processing.`);
});

worker.on(
  'failed',
  (job: Job<ObjectDetectionJobData> | undefined, err: Error) => {
    console.error(
      `[Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
    );
  },
);

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(
  `Object detection worker started. Listening to queue: ${QUEUE_NAME}`,
);

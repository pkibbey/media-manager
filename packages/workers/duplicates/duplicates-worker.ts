import { type Job, Worker } from 'bullmq';
import { appConfig } from 'shared/env';
import { createRedisConnection } from 'shared/redis';
import { processDuplicates } from './process-duplicates';
import { processVisualHash } from './process-visual-hash';

interface DuplicatesJobData {
  id: string;
  media_path: string;
  visual_hash?: string;
}

const redisConnection = createRedisConnection();

const QUEUE_NAME = 'duplicatesQueue';

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<DuplicatesJobData>,
): Promise<boolean> => {
  const {
    id: mediaId,
    media_path: mediaPath,
    visual_hash: visualHash,
  } = job.data;

  try {
    if (!visualHash) {
      await processVisualHash({ mediaId, mediaPath });
    }

    // Process duplicates using the extracted function
    return await processDuplicates({ mediaId });
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
const worker = new Worker<DuplicatesJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: appConfig.DUPLICATES_WORKER_CONCURRENCY,
});

worker.on('completed', (job: Job<DuplicatesJobData>) => {
  console.log(`[Worker] Job ${job.id} completed duplicates processing.`);
});

worker.on('failed', (job: Job<DuplicatesJobData> | undefined, err: Error) => {
  console.error(
    `[Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(
  `Duplicates detection worker started. Listening to queue: ${QUEUE_NAME}`,
);

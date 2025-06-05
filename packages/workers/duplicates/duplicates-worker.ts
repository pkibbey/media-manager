import { type Job, Worker } from 'bullmq';
import { appConfig } from 'shared/env';
import { createRedisConnection } from 'shared/redis';
import { processDeleteIdentical } from './process-delete-identical';
import { processDuplicates } from './process-duplicates';
import { processVisualHash } from './process-visual-hash';

export type DuplicatesProcessingMethod =
  | 'hash-only'
  | 'duplicates-only'
  | 'full'
  | 'delete-identical';

interface DuplicatesJobData {
  id?: string;
  media_path?: string;
  visual_hash?: string;
  method: DuplicatesProcessingMethod;
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
    method,
  } = job.data;

  try {
    // Process based on the specified method
    let result: boolean;

    switch (method) {
      case 'hash-only':
        if (!mediaId || !mediaPath) {
          throw new Error(
            'mediaId and mediaPath are required for hash-only method',
          );
        }
        result = await processVisualHash({ mediaId, mediaPath });
        break;
      case 'duplicates-only':
        if (!mediaId) {
          throw new Error('mediaId is required for duplicates-only method');
        }
        result = await processDuplicates({ mediaId });
        break;
      case 'full':
        if (!mediaId || !mediaPath) {
          throw new Error('mediaId and mediaPath are required for full method');
        }
        // Generate hash if missing, then process duplicates
        if (!visualHash) {
          await processVisualHash({ mediaId, mediaPath });
        }
        result = await processDuplicates({ mediaId });
        break;
      case 'delete-identical':
        result = await processDeleteIdentical();
        break;
      default:
        throw new Error(`Unknown duplicates processing method: ${method}`);
    }

    if (result) {
      console.log(
        `[Worker] Successfully processed ${method} duplicates for media ID: ${mediaId}`,
      );
      return true;
    }

    throw new Error(`Failed to process ${method} duplicates`);
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

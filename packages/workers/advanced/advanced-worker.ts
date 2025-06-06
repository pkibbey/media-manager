import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared';
import { appConfig, serverEnv } from 'shared/env';
import { processWithOllama } from './process-with-ollama';

export type AdvancedAnalysisMethod = 'ollama';

interface AdvancedAnalysisJobData {
  id: string;
  thumbnail_url: string;
  method: AdvancedAnalysisMethod;
}

const redisConnection = new IORedis(
  appConfig.REDIS_PORT,
  serverEnv.REDIS_HOST,
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const QUEUE_NAME = 'advancedAnalysisQueue';

// Initialize Supabase client once
const supabase = createSupabase();

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<AdvancedAnalysisJobData>,
): Promise<boolean> => {
  const { id: mediaId, thumbnail_url: thumbnailUrl, method } = job.data;

  try {
    // Process based on the specified method
    let result: any;

    switch (method) {
      case 'ollama':
        result = await processWithOllama({
          mediaId,
          thumbnailUrl,
        });
        break;
      default:
        throw new Error(`Unknown advanced analysis method: ${method}`);
    }

    if (!result.success || !result.analysisData) {
      throw new Error(result.error || `Failed to process with ${method}`);
    }

    // Save analysis data
    const { error: upsertError } = await supabase
      .from('analysis_data')
      .upsert(result.analysisData, { onConflict: 'media_id' });

    if (upsertError) {
      throw new Error(
        `Failed to save analysis data for media ID ${mediaId}: ${upsertError.message}`,
      );
    }

    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Worker] Error processing job ${job.id}:`, errorMessage);
    throw error; // Rethrow to allow BullMQ to handle retries/failures
  }
};

// Create and start the worker
const worker = new Worker<AdvancedAnalysisJobData>(
  QUEUE_NAME,
  workerProcessor,
  {
    connection: redisConnection,
    concurrency: appConfig.ADVANCED_ANALYSIS_WORKER_CONCURRENCY,
  },
);

// worker.on('completed', (job: Job<AdvancedAnalysisJobData>) => {
//   console.log(`[Worker] Job ${job.id} completed advanced analysis processing.`);
// });

worker.on(
  'failed',
  (job: Job<AdvancedAnalysisJobData> | undefined, err: Error) => {
    console.error(
      `[Worker] Job ${job?.id} (Media ID: ${job?.data.id}) failed with error: ${err.message}`,
    );
  },
);

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(
  `Advanced analysis worker started. Listening to queue: ${QUEUE_NAME}`,
);

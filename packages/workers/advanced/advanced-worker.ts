import 'dotenv/config';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from '@/lib/supabase';
import { processWithOllama } from './process-with-ollama';

interface AdvancedAnalysisJobData {
	id: string;
	thumbnail_url: string;
}

const redisConnection = new IORedis(
	process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
	process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
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
	const { id: mediaId, thumbnail_url: thumbnailUrl } = job.data;

	try {
		// Process the media item with Ollama
		const result = await processWithOllama({
			mediaId,
			thumbnailUrl,
		});

		if (!result.success || !result.analysisData) {
			throw new Error(result.error || 'Failed to process with Ollama');
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

		// Update the 'media' table to mark as processed
		const { error: mediaUpdateError } = await supabase
			.from('media')
			.update({ is_advanced_processed: true })
			.eq('id', mediaId);

		if (mediaUpdateError) {
			console.error(
				`[Worker] Failed to update 'is_advanced_processed' for media ID ${mediaId}:`,
				mediaUpdateError,
			);
		} else {
			console.log(
				`[Worker] Successfully marked media ID ${mediaId} as advanced processed.`,
			);
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
const worker = new Worker<AdvancedAnalysisJobData>(
	QUEUE_NAME,
	workerProcessor,
	{
		connection: redisConnection,
		concurrency: Number.parseInt(
			process.env.ADVANCED_ANALYSIS_WORKER_CONCURRENCY || '1',
		),
	},
);

worker.on('completed', (job: Job<AdvancedAnalysisJobData>) => {
	console.log(
		`[Worker] Job ${job.id} (Media ID: ${job.data.id}) completed advanced analysis processing.`,
	);
});

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

import 'dotenv/config.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import tf from '@tensorflow/tfjs-node';
import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { load } from 'nsfwjs';
import { createSupabase } from 'shared/supabase';
import type { Json } from 'shared/types';

interface ContentWarningsJobData {
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

const QUEUE_NAME = 'contentWarningsQueue';

// Initialize Supabase client once
const supabase = createSupabase();

// Save NSFWJS model variable in the global scope
// to avoid reloading it for every job, which can be expensive.
let model: any = null;

/**
 * Loads the NSFWJS model if it hasn't been loaded yet.
 */
async function initializeModel() {
	if (!model) {
		console.log('Loading NSFWJS model...');
		await tf.ready();
		model = await load('InceptionV3');
		console.log('NSFWJS model loaded successfully.');
	}
}

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
	job: Job<ContentWarningsJobData>,
): Promise<boolean> => {
	await initializeModel();
	if (!model) {
		throw new Error('NSFWJS model is not loaded.');
	}

	console.log('Processing content warnings job:', job.data);

	const { id: mediaId, thumbnail_url: thumbnailUrl } = job.data;

	let tensor: tf.Tensor3D | undefined;
	try {
		// Fetch the image buffer (use thumbnail for speed)
		const imageResponse = await fetch(thumbnailUrl);
		if (!imageResponse.ok) {
			throw new Error(
				`Failed to fetch image from ${thumbnailUrl}: ${imageResponse.statusText}`,
			);
		}
		const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

		// Decode JPEG
		tensor = tf.node.decodeJpeg(imageBuffer, 3);

		// Run Content Warnings detection
		const predictions = await model.classify(tensor);

		// Save detection results
		const { error: upsertError } = await supabase.from('analysis_data').upsert(
			{
				media_id: mediaId,
				content_warnings: predictions as unknown as Json[],
			},
			{ onConflict: 'media_id' },
		);

		if (upsertError) {
			throw new Error(
				`Failed to save content warnings data for media ID ${mediaId}: ${upsertError.message}`,
			);
		}

		// Update the 'media' table to mark as processed
		const { error: mediaUpdateError } = await supabase
			.from('media')
			.update({ is_content_warnings_processed: true })
			.eq('id', mediaId);

		if (mediaUpdateError) {
			console.error(
				`[Worker] Failed to update 'is_content_warnings_processed' for media ID ${mediaId}:`,
				mediaUpdateError,
			);
		} else {
			console.log(
				`[Worker] Successfully marked media ID ${mediaId} as content warnings processed.`,
			);
		}

		console.log(
			`[Worker] Detected ${predictions.length} content warnings for media ID ${mediaId}`,
		);
		return true;
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error(
			`[Worker] Error processing job ${job.id} for media ID ${mediaId}:`,
			errorMessage,
		);
		throw error; // Rethrow to allow BullMQ to handle retries/failures
	} finally {
		if (tensor) {
			tensor.dispose(); // IMPORTANT: Clean up tensor memory
		}
	}
};

// Create and start the worker
const worker = new Worker<ContentWarningsJobData>(QUEUE_NAME, workerProcessor, {
	connection: redisConnection,
	concurrency: Number.parseInt(
		process.env.CONTENT_WARNINGS_WORKER_CONCURRENCY || '1',
	),
});

worker.on('completed', (job: Job<ContentWarningsJobData>) => {
	console.log(
		`[Worker] Job ${job.id} (Media ID: ${job.data.id}) completed content warnings processing.`,
	);
});

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

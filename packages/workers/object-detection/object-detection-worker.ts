import 'dotenv/config.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import * as tf from '@tensorflow/tfjs-node';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from '@/lib/supabase';
import type { Json } from '@/types/supabase';

interface ObjectDetectionJobData {
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

const QUEUE_NAME = 'objectAnalysisQueue';

// Initialize Supabase client once
const supabase = createSupabase();

// Save COCO-SSD model variable in the global scope
// to avoid reloading it for every job, which can be expensive.
let model: cocoSsd.ObjectDetection | null = null;

/**
 * Loads the COCO-SSD model if it hasn't been loaded yet.
 */
async function initializeModel() {
	if (!model) {
		console.log('Loading COCO-SSD model...');
		await tf.ready();
		model = await cocoSsd.load();
		console.log('COCO-SSD model loaded successfully.');
	}
}

/**
 * Fetches an image from a URL and converts it to a TensorFlow tensor.
 * @param url The URL of the image.
 * @returns A Promise resolving to a tf.Tensor3D.
 */
async function loadImage(url: string): Promise<tf.Tensor3D> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch image from ${url}: ${response.statusText}`,
		);
	}
	const buffer = await response.arrayBuffer();

	// Decode the image buffer into a tensor
	const imageTensor = tf.node.decodeJpeg(new Uint8Array(buffer), 3);
	return imageTensor;
}

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
	job: Job<ObjectDetectionJobData>,
): Promise<boolean> => {
	await initializeModel();
	if (!model) {
		throw new Error('COCO-SSD model is not loaded.');
	}

	const { id: mediaId, thumbnail_url: thumbnailUrl } = job.data;

	let imageTensor: tf.Tensor3D | undefined;
	try {
		// Load the image from the thumbnail URL
		imageTensor = await loadImage(thumbnailUrl);

		// Perform object detection
		const predictions = await model.detect(imageTensor);

		// Save detection results
		const { error: upsertError } = await supabase.from('analysis_data').upsert(
			{
				media_id: mediaId,
				objects: predictions as unknown as Json[],
			},
			{ onConflict: 'media_id' },
		);

		if (upsertError) {
			throw new Error(
				`Failed to save analysis data for media ID ${mediaId}: ${upsertError.message}`,
			);
		}

		// Update the 'media' table to mark as processed
		const { error: mediaUpdateError } = await supabase
			.from('media')
			.update({ is_basic_processed: true }) // Ensure 'is_basic_processed' is the correct column
			.eq('id', mediaId);

		if (mediaUpdateError) {
			// Log error but don't necessarily fail the job if primary data (analysis_data) was saved.
			console.error(
				`[Worker] Failed to update 'is_basic_processed' for media ID ${mediaId}:`,
				mediaUpdateError,
			);
		}
		console.log(
			`[Worker] Detected ${predictions.length} objects for media ID ${mediaId}`,
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
		if (imageTensor) {
			imageTensor.dispose(); // IMPORTANT: Clean up tensor memory
		}
	}
};

// Create and start the worker
const worker = new Worker<ObjectDetectionJobData>(QUEUE_NAME, workerProcessor, {
	connection: redisConnection,
	concurrency: Number.parseInt(
		process.env.OBJECT_DETECTION_WORKER_CONCURRENCY || '1',
	),
});

worker.on('completed', (job: Job<ObjectDetectionJobData>) => {
	console.log(
		`[Worker] Job ${job.id} (Media ID: ${job.data.id}) completed object detection processing.`,
	);
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

import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared';

interface DuplicatesJobData {
	id: string;
	visual_hash?: string;
}

const redisConnection = new IORedis(
	process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
	process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
	{
		maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
	},
);

const QUEUE_NAME = 'duplicatesQueue';

// Initialize Supabase client once
const supabase = createSupabase();

/**
 * Calculate Hamming distance between two hex strings
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns Hamming distance (number of differing bits)
 */
function calculateHammingDistance(hash1: string, hash2: string): number {
	if (hash1.length !== hash2.length) {
		return -1;
	}

	let distance = 0;
	for (let i = 0; i < hash1.length; i++) {
		const char1 = Number.parseInt(hash1[i], 16);
		const char2 = Number.parseInt(hash2[i], 16);
		const xor = char1 ^ char2;

		// Count bits set in XOR result
		let bits = xor;
		while (bits) {
			distance += bits & 1;
			bits >>= 1;
		}
	}

	return distance;
}

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
	job: Job<DuplicatesJobData>,
): Promise<boolean> => {
	const { id: mediaId, visual_hash: visualHash } = job.data;

	try {
		if (!visualHash) {
			throw new Error('No visual hash provided for duplicate detection');
		}

		// Find potential duplicates
		const { data: similarItems, error: findError } = await supabase
			.from('media')
			.select('id, visual_hash')
			.not('id', 'eq', mediaId) // Exclude the current item
			.not('visual_hash', 'is', null)
			.is('is_deleted', false);

		if (findError) {
			throw new Error(
				`Failed to find potential duplicates: ${findError.message}`,
			);
		}

		// Calculate similarity with other items
		const potentialDuplicates = similarItems
			?.filter((item) => item.visual_hash)
			.map((item) => {
				const distance = calculateHammingDistance(
					visualHash,
					item.visual_hash!,
				);
				return {
					mediaId: item.id,
					visualHash: item.visual_hash!,
					hammingDistance: distance,
					// Consider duplicate if hamming distance is low (adjust threshold as needed)
					isDuplicate: distance >= 0 && distance <= 10,
				};
			})
			.filter((item) => item.isDuplicate);

		// Save detection results if any duplicates are found
		if (potentialDuplicates && potentialDuplicates.length > 0) {
			const { error: upsertError } = await supabase.from('duplicates').upsert(
				potentialDuplicates.map((dup) => ({
					media_id: mediaId,
					duplicate_id: dup.mediaId,
					similarity_score: 1 - dup.hammingDistance / (visualHash.length * 4), // Normalize to 0-1
					hamming_distance: dup.hammingDistance,
				})),
				{ onConflict: 'media_id,duplicate_id' },
			);

			if (upsertError) {
				throw new Error(
					`Failed to save duplicates data for media ID ${mediaId}: ${upsertError.message}`,
				);
			}
		}

		// Mark as processed regardless of whether duplicates were found
		const { error: updateError } = await supabase
			.from('media')
			.update({ is_duplicates_processed: true })
			.eq('id', mediaId);

		if (updateError) {
			console.error(
				`[Worker] Failed to update is_duplicates_processed for media ID ${mediaId}:`,
				updateError,
			);
		} else {
			console.log(
				`[Worker] Successfully marked media ID ${mediaId} as duplicates processed.`,
			);
		}

		console.log(
			`[Worker] Found ${potentialDuplicates?.length || 0} potential duplicates for media ID ${mediaId}`,
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
	}
};

// Create and start the worker
const worker = new Worker<DuplicatesJobData>(QUEUE_NAME, workerProcessor, {
	connection: redisConnection,
	concurrency: Number.parseInt(
		process.env.DUPLICATES_WORKER_CONCURRENCY || '1',
	),
});

worker.on('completed', (job: Job<DuplicatesJobData>) => {
	console.log(
		`[Worker] Job ${job.id} (Media ID: ${job.data.id}) completed duplicates processing.`,
	);
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

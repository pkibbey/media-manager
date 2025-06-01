'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared/supabase';

const connection = new IORedis(
	process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
	process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
	{
		maxRetriesPerRequest: null, // Disable automatic retries
	},
);

const objectAnalysisQueue = new Queue('objectAnalysisQueue', { connection });

const JOB_NAME = 'object-detection-basic';

export async function addRemainingToProcessingQueue() {
	const supabase = createSupabase();
	let offset = 0;
	const batchSize = 1000; // Supabase default limit, can be adjusted if needed

	try {
		while (true) {
			const { data: mediaItems, error } = await supabase
				.from('media')
				.select('id, thumbnail_url')
				.eq('is_basic_processed', false)
				.eq('is_thumbnail_processed', true)
				.range(offset, offset + batchSize - 1);

			if (error) {
				console.error('Error fetching unprocessed media items:', error);
				return false;
			}

			if (!mediaItems || mediaItems.length === 0) {
				// No more items to fetch
				return false;
			}

			const jobs = await objectAnalysisQueue.addBulk(
				mediaItems.map((data) => ({
					name: JOB_NAME,
					data,
				})),
			);

			console.log('Added', jobs.length, 'to the queue for processing');

			offset += mediaItems.length;

			// If fewer items than batchSize were returned, it means we've fetched all available items
			if (mediaItems.length < batchSize) {
				return false;
			}
		}
	} catch (e) {
		const errorMessage =
			e instanceof Error ? e.message : 'Unknown error occurred';
		console.error('Error in addRemainingToProcessingQueue:', errorMessage);
		return false;
	}
}

export async function clearBasicAnalysisQueue() {
	try {
		const count = await objectAnalysisQueue.getJobCountByTypes(
			'waiting',
			'active',
			'completed',
			'failed',
			'delayed',
			'paused',
		);
		if (count > 0) {
			await objectAnalysisQueue.drain(true);
		}
		return true;
	} catch (error) {
		console.error('Error clearing basic analysis queue:', error);
		return false;
	}
}

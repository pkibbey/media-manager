'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from "@/lib/supabase";

const connection = new IORedis(
	process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
	process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
	{
		maxRetriesPerRequest: null,
	},
);

const advancedAnalysisQueue = new Queue('advancedAnalysisQueue', {
	connection,
});

const JOB_NAME = 'object-detection-advanced';

export async function addRemainingToAdvancedAnalysisQueue() {
	const supabase = createSupabase();
	let offset = 0;
	const batchSize = 1000;

	try {
		while (true) {
			const { data: mediaItems, error } = await supabase
				.from('media')
				.select('id, thumbnail_url')
				.eq('is_advanced_processed', false)
				.eq('is_thumbnail_processed', true) // Ensure thumbnail is processed
				.range(offset, offset + batchSize - 1);

			if (error) {
				console.error('Error fetching unprocessed media items:', error);
				return false;
			}

			if (!mediaItems || mediaItems.length === 0) {
				return false;
			}

			const jobs = await advancedAnalysisQueue.addBulk(
				mediaItems.map((data) => ({
					name: JOB_NAME,
					data,
				})),
			);

			console.log(
				'Added',
				jobs.length,
				'to the advanced analysis queue for processing',
			);

			offset += mediaItems.length;
			if (mediaItems.length < batchSize) {
				return false;
			}
		}
	} catch (e) {
		const errorMessage =
			e instanceof Error ? e.message : 'Unknown error occurred';
		console.error(
			'Error in addRemainingToAdvancedAnalysisQueue:',
			errorMessage,
		);
		return false;
	}
}

export async function clearAdvancedAnalysisQueue() {
	try {
		const count = await advancedAnalysisQueue.getJobCountByTypes(
			'waiting',
			'active',
			'completed',
			'failed',
			'delayed',
			'paused',
		);
		if (count > 0) {
			await advancedAnalysisQueue.drain(true);
		}
		return true;
	} catch (error) {
		console.error('Error clearing advanced analysis queue:', error);
		return false;
	}
}

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

const thumbnailQueue = new Queue('thumbnailQueue', { connection });

export async function clearThumbnailsQueue() {
	try {
		const count = await thumbnailQueue.getJobCountByTypes(
			'waiting',
			'active',
			'completed',
			'failed',
			'delayed',
			'paused',
		);
		if (count > 0) {
			await thumbnailQueue.drain(true);
      await thumbnailQueue.clean(0, 1000000, 'completed');
		}
		return true;
	} catch (error) {
		console.error('Error clearing thumbnail queue:', error);
		return false;
	}
}

export async function addRemainingToThumbnailsQueue() {
	const supabase = createSupabase();
	let offset = 0;
	const batchSize = 1000;

	try {
		while (true) {
			const { data: mediaItems, error } = await supabase
				.from('media')
				.select('id, media_path')
				.eq('is_thumbnail_processed', false)
				.is('is_exif_processed', true)
				.range(offset, offset + batchSize - 1);

			if (error) {
				console.error('Error fetching unprocessed media items:', error);
				return false;
			}

			if (!mediaItems || mediaItems.length === 0) {
				return false;
			}

			const jobs = await thumbnailQueue.addBulk(
				mediaItems.map((data) => ({
					name: 'thumbnail-generation',
					data,
				})),
			);

			console.log(
				'Added',
				jobs.length,
				'to the thumbnail queue for processing',
			);

			offset += mediaItems.length;
			if (mediaItems.length < batchSize) {
				return false;
			}
		}
	} catch (e) {
		const errorMessage =
			e instanceof Error ? e.message : 'Unknown error occurred';
		console.error('Error in addRemainingToThumbnailsQueue:', errorMessage);
		return false;
	}
}

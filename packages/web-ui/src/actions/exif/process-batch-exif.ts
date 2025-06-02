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

const exifQueue = new Queue('exifQueue', { connection });

export async function addRemainingToExifQueue() {
	const supabase = createSupabase();
	let offset = 0;
	const batchSize = 1000;

	try {
		while (true) {
			const { data: mediaItems, error } = await supabase
				.from('media')
				.select('id, media_path, media_types(is_ignored)')
				// .eq('is_exif_processed', false)
				.is('media_types.is_ignored', false)
				.range(offset, offset + batchSize - 1);

			if (error) {
				console.error('Error fetching unprocessed media items:', error);
				return false;
			}

			if (!mediaItems || mediaItems.length === 0) {
				return false;
			}

			const jobs = await exifQueue.addBulk(
				mediaItems.map((data) => ({
					name: 'exif-extraction',
					data,
				})),
			);

			console.log('Added', jobs.length, 'to the exif queue for processing');

			offset += mediaItems.length;
			if (mediaItems.length < batchSize) {
				return false;
			}
		}
	} catch (e) {
		const errorMessage =
			e instanceof Error ? e.message : 'Unknown error occurred';
		console.error('Error in addRemainingToExifQueue:', errorMessage);
		return false;
	}
}

export async function clearExifQueue() {
	try {
		const count = await exifQueue.getJobCountByTypes(
			'waiting',
			'active',
			'completed',
			'failed',
			'delayed',
			'paused',
		);
		if (count > 0) {
			await exifQueue.drain(true);
      await exifQueue.clean(0, 1000000, 'completed');
		}
		return true;
	} catch (error) {
		console.error('Error clearing exif queue:', error);
		return false;
	}
}

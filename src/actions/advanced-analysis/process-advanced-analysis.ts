'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/supabase';
import { processWithOllamaBatchOptimized } from './process-wtih-ollama';

/**
 * Process advanced analysis for multiple media items in batch using grouped database operations
 *
 * This implementation uses the optimized pattern:
 * 1. Processes all Ollama AI analysis first (CPU/network intensive work)
 * 2. Groups all database inserts into a single batch operation
 * 3. Groups all media status updates into a single batch operation
 *
 * This reduces database operations from 2*N (where N is batch size) to just 2 total operations.
 *
 * @param limit - Maximum number of items to process
 * @param concurrency - Number of items to process in parallel
 * @returns Object with count of processed items and any errors
 */
export async function processAdvancedAnalysis(limit = 10, concurrency = 3) {
	try {
		const supabase = createSupabase();

		// Find media items that need analysis processing
		const { data: mediaItems, error: findError } = await supabase
			.from('media')
			.select('*, media_types(is_ignored)')
			.eq('is_thumbnail_processed', true)
			.eq('is_advanced_processed', false)
			.is('media_types.is_ignored', false)
			.limit(limit);

		if (findError) {
			throw new Error(`Failed to find unprocessed items: ${findError.message}`);
		}

		if (!mediaItems || mediaItems.length === 0) {
			return {
				success: true,
				processed: 0,
				failed: 0,
				total: 0,
				message: 'No items to process',
			};
		}

		console.log(
			`Processing advanced analysis for ${mediaItems.length} items with concurrency ${concurrency}`,
		);
		const batchStartTime = Date.now();

		// Process items with controlled concurrency (AI processing first)
		const results: Array<{
			success: boolean;
			mediaId: string;
			processingTime: number;
			error?: string;
			analysisData?: TablesInsert<'analysis_data'>;
		}> = [];
		let idx = 0;
		const items = mediaItems || [];

		async function worker() {
			while (idx < items.length) {
				const myIdx = idx++;
				const item = items[myIdx];

				try {
					// Check if thumbnail URL exists
					if (!item.thumbnail_url) {
						console.warn(`No thumbnail URL for item ${item.id}, skipping`);
						results.push({
							success: false,
							mediaId: item.id,
							processingTime: 0,
							error: 'No thumbnail URL available',
						});
						continue;
					}

					const result = await processWithOllamaBatchOptimized({
						mediaId: item.id,
						thumbnailUrl: item.thumbnail_url,
					});

					results.push(result);
				} catch (itemError) {
					console.error(`Error processing item ${item.id}:`, itemError);
					results.push({
						success: false,
						mediaId: item.id,
						processingTime: 0,
						error:
							itemError instanceof Error ? itemError.message : 'Unknown error',
					});
				}
			}
		}

		// Launch workers
		const workers = Array.from({ length: concurrency }, () => worker());
		await Promise.all(workers);

		// Prepare grouped database operations
		const analysisDataToInsert: TablesInsert<'analysis_data'>[] = [];
		const mediaIdsToUpdate: string[] = [];
		let failed = 0;

		// Process results and prepare batch operations
		results.forEach((result) => {
			if (result.success) {
				mediaIdsToUpdate.push(result.mediaId);
				if (result.analysisData) {
					analysisDataToInsert.push(result.analysisData);
				}
			} else {
				failed++;
			}
		});

		// Perform grouped database operations
		// 1. Insert analysis data in batches if there are any to insert
		if (analysisDataToInsert.length > 0) {
			const { error: insertError } = await supabase
				.from('analysis_data')
				.upsert(analysisDataToInsert, {
					onConflict: 'media_id',
				});

			if (insertError) {
				throw new Error(
					`Failed to batch insert analysis data: ${insertError.message}`,
				);
			}
		}

		// 2. Update all processed media items in a single operation
		if (mediaIdsToUpdate.length > 0) {
			const { error: updateError } = await supabase
				.from('media')
				.update({ is_advanced_processed: true })
				.in('id', mediaIdsToUpdate);

			if (updateError) {
				throw new Error(
					`Failed to batch update media items: ${updateError.message}`,
				);
			}
		}

		const succeeded = mediaIdsToUpdate.length;
		const totalProcessingTime = Date.now() - batchStartTime;

		return {
			success: true,
			processed: succeeded,
			failed,
			total: items.length,
			batchProcessingTime: totalProcessingTime,
			message: `Processed ${succeeded} items (${failed} failed) in advanced analysis`,
		};
	} catch (error) {
		console.error('Error in batch analysis processing:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			failed: 0,
			total: 0,
			processed: 0,
			message: 'Advanced analysis batch processing failed',
		};
	}
}

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

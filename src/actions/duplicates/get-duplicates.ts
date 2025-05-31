'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from '@/lib/supabase';
import type { MediaWithRelations } from '@/types/media-types';

const connection = new IORedis(
	process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
	process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
	{
		maxRetriesPerRequest: null,
	},
);

const duplicatesQueue = new Queue('duplicatesQueue', { connection });

const JOB_NAME = 'duplicate-detection';

export interface DuplicateGroup {
	hash: string;
	items: MediaWithRelations[];
	similarity: 'exact' | 'high' | 'medium';
	hammingDistance?: number;
}

export interface DuplicatesResult {
	groups: DuplicateGroup[];
	stats: {
		totalGroups: number;
		totalDuplicateItems: number;
		exactMatches: number;
		similarMatches: number;
	};
	error?: string;
}

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
 * Categorize similarity based on Hamming distance
 * @param distance - Hamming distance
 * @param totalBits - Total number of bits in hash
 * @returns Similarity category
 */
function categorizeSimilarity(
	distance: number,
	totalBits: number,
): 'exact' | 'high' | 'medium' {
	if (distance === 0) return 'exact';

	const percentage = (distance / totalBits) * 100;

	if (percentage <= 10) return 'high';
	if (percentage <= 25) return 'medium';

	return 'medium'; // We'll filter out anything beyond medium similarity
}

/**
 * Find potential duplicate images based on visual hash comparison
 * @param maxHammingDistance - Maximum Hamming distance to consider as similar (default: 10)
 * @returns Groups of potentially duplicate images
 */
export async function getDuplicates(
	maxHammingDistance = 10,
): Promise<DuplicatesResult> {
	try {
		const supabase = createSupabase();

		// Get all media items that have visual hashes and are images
		const { data: mediaItems, error } = await supabase
			.from('media')
			.select(`
        *,
        media_types!inner(*),
        exif_data(*),
        analysis_data(*)
      `)
			.not('visual_hash', 'is', null)
			.ilike('media_types.mime_type', '%image%')
			.is('media_types.is_ignored', false)
			.is('is_deleted', false);

		if (error) {
			throw new Error(`Failed to fetch media items: ${error.message}`);
		}

		if (!mediaItems || mediaItems.length === 0) {
			return {
				groups: [],
				stats: {
					totalGroups: 0,
					totalDuplicateItems: 0,
					exactMatches: 0,
					similarMatches: 0,
				},
			};
		}

		console.log(
			`[getDuplicates] Analyzing ${mediaItems.length} items for duplicates`,
		);

		// Send to Ollama server for processing
		const response = await fetch(`http://${process.env.DUPLICATES_HOST}:${process.env.DUPLICATES_PORT}/process-duplicates`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mediaItems, maxHammingDistance }),
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const { exactGroups, similarGroups } = await response.json();
		const groups = [...exactGroups, ...similarGroups];

		// Sort groups by similarity and number of items
		groups.sort((a, b) => {
			// Exact matches first
			if (a.similarity === 'exact' && b.similarity !== 'exact') return -1;
			if (b.similarity === 'exact' && a.similarity !== 'exact') return 1;

			// Then by number of items (more duplicates first)
			if (a.items.length !== b.items.length) {
				return b.items.length - a.items.length;
			}

			// Then by hamming distance (closer matches first)
			return (a.hammingDistance || 0) - (b.hammingDistance || 0);
		});

		const exactMatches = exactGroups.reduce((total: number, group: { items: string | any[]; }) => total + group.items.length, 0);
		const similarMatches = similarGroups.reduce((total: number, group: { items: string | any[]; }) => total + group.items.length, 0);

		const stats = {
			totalGroups: groups.length,
			totalDuplicateItems: exactMatches + similarMatches,
			exactMatches,
			similarMatches,
		};

		console.log(
			`[getDuplicates] Found ${stats.totalGroups} duplicate groups with ${stats.totalDuplicateItems} items`,
		);

		return { groups, stats };
	} catch (error) {
		console.error('[getDuplicates] Error finding duplicates:', error);
		return {
			groups: [],
			stats: {
				totalGroups: 0,
				totalDuplicateItems: 0,
				exactMatches: 0,
				similarMatches: 0,
			},
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

export async function addRemainingToDuplicatesQueue() {
	const supabase = createSupabase();
	let offset = 0;
	const batchSize = 1000;

	try {
		while (true) {
			const { data: mediaItems, error } = await supabase
				.from('media')
				.select('id, visual_hash')
				.eq('is_duplicates_processed', false)
				.not('visual_hash', 'is', null) // Must have a visual hash
				.range(offset, offset + batchSize - 1);

			if (error) {
				console.error('Error fetching unprocessed media items:', error);
				return false;
			}

			if (!mediaItems || mediaItems.length === 0) {
				return false;
			}

			const jobs = await duplicatesQueue.addBulk(
				mediaItems.map((data) => ({
					name: JOB_NAME,
					data,
				})),
			);

			console.log(
				'Added',
				jobs.length,
				'to the duplicates queue for processing',
			);

			offset += mediaItems.length;
			if (mediaItems.length < batchSize) {
				return false;
			}
		}
	} catch (e) {
		const errorMessage =
			e instanceof Error ? e.message : 'Unknown error occurred';
		console.error('Error in addRemainingToDuplicatesQueue:', errorMessage);
		return false;
	}
}

export async function clearDuplicatesQueue() {
	try {
		const count = await duplicatesQueue.getJobCountByTypes(
			'waiting',
			'active',
			'completed',
			'failed',
			'delayed',
			'paused',
		);
		if (count > 0) {
			await duplicatesQueue.drain(true);
		}
		return true;
	} catch (error) {
		console.error('Error clearing duplicates queue:', error);
		return false;
	}
}

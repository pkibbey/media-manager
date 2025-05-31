'use server';

import fs from 'node:fs/promises';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import sharp from 'sharp';
import { XXH3_128 } from 'xxh3-ts';

import { processInChunks } from '@/lib/batch-processing';
import {
	BACKGROUND_COLOR,
	THUMBNAIL_QUALITY,
	THUMBNAIL_SIZE,
} from '@/lib/consts';
import { createSupabase } from '@/lib/supabase';
import {
	processNativeThumbnail,
	processRawThumbnail,
	type ThumbnailGenerationResult,
} from '@/lib/thumbnail-generators';
import { storeThumbnail } from '@/lib/thumbnail-storage';
import type { MediaWithRelations } from '@/types/media-types';
import type { TablesUpdate } from '@/types/supabase';

/**
 * Generate a perceptual hash (dHash) from a 16x16 grayscale image fingerprint.
 * @param fingerprint - The raw 16x16 grayscale image fingerprint buffer (256 bytes).
 * @returns A hex string representation of the perceptual hash, or null if generation fails.
 */
async function generateVisualHashFromFingerprint(
	fingerprint: Buffer,
): Promise<string | null> {
	try {
		if (!fingerprint || fingerprint.length !== 256) {
			console.error(
				'[generateVisualHashFromFingerprint] Invalid fingerprint buffer length:',
				fingerprint?.length,
			);
			return null;
		}

		// Implement difference hash (dHash) algorithm
		// Compare each pixel with the pixel to its right
		const hash: number[] = [];

		for (let row = 0; row < 16; row++) {
			for (let col = 0; col < 15; col++) {
				// Only go to 15 to compare with next pixel
				const currentPixel = fingerprint[row * 16 + col];
				const nextPixel = fingerprint[row * 16 + col + 1];

				// If current pixel is brighter than next pixel, set bit to 1
				hash.push(currentPixel > nextPixel ? 1 : 0);
			}
		}

		// Convert the binary hash to a hexadecimal string
		const hashString = convertBinaryToHex(hash);

		return hashString;
	} catch (_error) {
		return null;
	}
}

/**
 * Converts an array of binary bits to a hexadecimal string.
 * @param binaryArray - Array of 1s and 0s
 * @returns Hexadecimal string representation
 */
function convertBinaryToHex(binaryArray: number[]): string {
	let hexString = '';

	// Process 4 bits at a time to create hex digits
	for (let i = 0; i < binaryArray.length; i += 4) {
		const nibble = binaryArray.slice(i, i + 4);

		// Pad with zeros if needed
		while (nibble.length < 4) {
			nibble.push(0);
		}

		// Convert 4 bits to decimal then to hex
		const decimal = nibble[0] * 8 + nibble[1] * 4 + nibble[2] * 2 + nibble[3];
		hexString += decimal.toString(16);
	}

	return hexString;
}

interface ProcessingStep {
	name: string;
	success: boolean;
	error?: string;
	data?: any;
	durationMs?: number; // Add duration in milliseconds
}

interface ProcessingResult {
	mediaId: string;
	success: boolean;
	steps: ProcessingStep[];
	finalData?: {
		fileHash?: string | null;
		visualHash?: string | null;
		thumbnailUrl?: string | null;
	};
}

/**
 * Generate a simple solid color thumbnail as ultimate fallback
 */
async function generateFallbackThumbnail(): Promise<Buffer> {
	try {
		return await sharp({
			create: {
				width: THUMBNAIL_SIZE,
				height: THUMBNAIL_SIZE,
				channels: 3,
				background: { r: 128, g: 128, b: 128 },
			},
		})
			.jpeg({ quality: THUMBNAIL_QUALITY })
			.toBuffer();
	} catch (error) {
		// If even this fails, create a minimal buffer
		console.error('Failed to generate fallback thumbnail:', error);
		throw new Error('Critical: Cannot generate any thumbnail');
	}
}

/**
 * Enhanced thumbnail generation with multiple fallback strategies
 */
async function generateThumbnailWithFallbacks(
	mediaItem: MediaWithRelations,
	fileBuffer: Buffer,
): Promise<{ thumbnailBuffer: Buffer; imageFingerprint: Buffer | null }> {
	const attempts: Array<() => Promise<ThumbnailGenerationResult | null>> = [];

	// Strategy 1: Use existing logic based on media type
	if (mediaItem.media_types?.is_native) {
		attempts.push(() => processNativeThumbnail(mediaItem, fileBuffer));
	} else {
		attempts.push(() => processRawThumbnail(mediaItem, fileBuffer));
	}

	// Strategy 2: Try Sharp with different settings (more permissive)
	attempts.push(async () => {
		try {
			const sharpInstance = sharp(fileBuffer, { failOnError: false });

			const thumbnailBuffer = await sharpInstance
				.clone()
				.resize({
					width: THUMBNAIL_SIZE,
					height: THUMBNAIL_SIZE,
					withoutEnlargement: true,
					fit: 'contain',
					background: BACKGROUND_COLOR,
				})
				.jpeg({ quality: THUMBNAIL_QUALITY })
				.toBuffer();

			// Try to generate fingerprint, but don't fail if it doesn't work
			let imageFingerprint: Buffer | null = null;
			try {
				imageFingerprint = await sharpInstance
					.clone()
					.greyscale()
					.resize(16, 16, { fit: 'fill' })
					.raw()
					.toBuffer();
			} catch (fingerprintError) {
				console.warn(
					'Failed to generate fingerprint in fallback method:',
					fingerprintError,
				);
			}

			return { thumbnailBuffer, imageFingerprint };
		} catch (_error) {
			return null;
		}
	});

	// Strategy 3: Try Sharp with even more basic settings
	attempts.push(async () => {
		try {
			const thumbnailBuffer = await sharp(fileBuffer, {
				failOnError: false,
				unlimited: true,
			})
				.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'contain' })
				.flatten({ background: BACKGROUND_COLOR })
				.jpeg({ quality: 50 }) // Lower quality for compatibility
				.toBuffer();

			return { thumbnailBuffer, imageFingerprint: null };
		} catch (_error) {
			return null;
		}
	});

	// Try each strategy in order
	for (let i = 0; i < attempts.length; i++) {
		try {
			const result = await attempts[i]();
			if (result?.thumbnailBuffer) {
				console.log(`Thumbnail generated successfully using strategy ${i + 1}`);
				return result;
			}
		} catch (_error) {}
	}

	// Ultimate fallback: generate a solid color thumbnail
	console.warn(
		`All thumbnail strategies failed for media ${mediaItem.id}, using solid color fallback`,
	);
	const fallbackBuffer = await generateFallbackThumbnail();
	return { thumbnailBuffer: fallbackBuffer, imageFingerprint: null };
}

/**
 * Process a single media item with comprehensive error handling
 */
async function processMediaItemV2(
	mediaItem: MediaWithRelations,
): Promise<ProcessingResult> {
	const result: ProcessingResult = {
		mediaId: mediaItem.id,
		success: false,
		steps: [],
	};

	// Step 1: Read file
	const readStart = Date.now();
	let fileBuffer: Buffer;
	try {
		if (!mediaItem.media_path) {
			throw new Error('No media_path available');
		}
		fileBuffer = await fs.readFile(mediaItem.media_path);
		result.steps.push({
			name: 'File Read',
			success: true,
			durationMs: Date.now() - readStart,
		});
	} catch (error) {
		result.steps.push({
			name: 'File Read',
			success: false,
			error: error instanceof Error ? error.message : 'Unknown file read error',
			durationMs: Date.now() - readStart,
		});
		return result;
	}

	// Step 2: Generate file hash
	const hashStart = Date.now();
	let fileHash: string | null = null;
	try {
		fileHash = XXH3_128(fileBuffer, BigInt(0xabcd)).toString(16);
		result.steps.push({
			name: 'File Hash',
			success: true,
			data: fileHash,
			durationMs: Date.now() - hashStart,
		});
	} catch (error) {
		result.steps.push({
			name: 'File Hash',
			success: false,
			error: error instanceof Error ? error.message : 'Hash generation failed',
			durationMs: Date.now() - hashStart,
		});
	}

	// Step 3: Generate thumbnail with fallbacks
	const thumbStart = Date.now();
	let thumbnailBuffer: Buffer;
	let imageFingerprint: Buffer | null = null;
	try {
		const thumbnailResult = await generateThumbnailWithFallbacks(
			mediaItem,
			fileBuffer,
		);
		thumbnailBuffer = thumbnailResult.thumbnailBuffer;
		imageFingerprint = thumbnailResult.imageFingerprint;
		result.steps.push({
			name: 'Thumbnail Generation',
			success: true,
			durationMs: Date.now() - thumbStart,
		});
	} catch (error) {
		result.steps.push({
			name: 'Thumbnail Generation',
			success: false,
			error:
				error instanceof Error ? error.message : 'Thumbnail generation failed',
			durationMs: Date.now() - thumbStart,
		});
		return result;
	}

	// Step 4: Generate visual hash
	const visualStart = Date.now();
	let visualHash: string | null = null;
	try {
		if (imageFingerprint) {
			visualHash = await generateVisualHashFromFingerprint(imageFingerprint);
			result.steps.push({
				name: 'Visual Hash',
				success: !!visualHash,
				data: visualHash,
				durationMs: Date.now() - visualStart,
			});
		} else {
			result.steps.push({
				name: 'Visual Hash',
				success: false,
				error: 'No fingerprint available',
				durationMs: Date.now() - visualStart,
			});
		}
	} catch (error) {
		result.steps.push({
			name: 'Visual Hash',
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Visual hash generation failed',
			durationMs: Date.now() - visualStart,
		});
	}

	console.log('visualHash: ', visualHash);

	// Step 5: Store thumbnail
	const storeStart = Date.now();
	let thumbnailUrl: string | null = null;
	try {
		const storageResult = await storeThumbnail(mediaItem.id, thumbnailBuffer);
		if (storageResult.success && storageResult.thumbnailUrl) {
			thumbnailUrl = storageResult.thumbnailUrl;
			result.steps.push({
				name: 'Thumbnail Storage',
				success: true,
				data: thumbnailUrl,
				durationMs: Date.now() - storeStart,
			});
		} else {
			result.steps.push({
				name: 'Thumbnail Storage',
				success: false,
				error: 'Storage failed but no error thrown',
				durationMs: Date.now() - storeStart,
			});
			// Continue to mark as processed even if storage fails
		}
	} catch (error) {
		result.steps.push({
			name: 'Thumbnail Storage',
			success: false,
			error: error instanceof Error ? error.message : 'Storage error',
			durationMs: Date.now() - storeStart,
		});
		// Continue to mark as processed even if storage fails
	}

	// Step 6: Update database
	const dbStart = Date.now();
	try {
		const supabase = createSupabase();
		const updateFields: TablesUpdate<'media'> = {
			is_thumbnail_processed: true,
			visual_hash: visualHash || undefined,
			file_hash: fileHash || undefined,
			thumbnail_url: thumbnailUrl || undefined,
		};

		const { error: updateError } = await supabase
			.from('media')
			.update(updateFields)
			.eq('id', mediaItem.id);

		if (updateError) {
			throw new Error(updateError.message);
		}

		result.steps.push({
			name: 'Database Update',
			success: true,
			durationMs: Date.now() - dbStart,
		});
		result.success = true;
		result.finalData = { fileHash, visualHash, thumbnailUrl };
	} catch (error) {
		result.steps.push({
			name: 'Database Update',
			success: false,
			error: error instanceof Error ? error.message : 'DB update failed',
			durationMs: Date.now() - dbStart,
		});

		// Even if the main update fails, try to at least mark as processed
		try {
			const supabase = createSupabase();
			await supabase
				.from('media')
				.update({ is_thumbnail_processed: true })
				.eq('id', mediaItem.id);
			result.steps.push({
				name: 'Fallback DB Update',
				success: true,
				durationMs: Date.now() - dbStart,
			});
		} catch (_fallbackError) {
			result.steps.push({
				name: 'Fallback DB Update',
				success: false,
				error: 'Could not mark as processed',
				durationMs: Date.now() - dbStart,
			});
		}
	}

	result.steps.forEach((step) => {
		console.log(`[processMediaItemV2] ${step.name}: ${step.durationMs}ms`);
	});

	return result;
}

/**
 * Process a thumbnail for a media item.
 * This is the main function that should be called from workers and other places.
 *
 * @param params - Object containing processing parameters
 * @param params.mediaId - The ID of the media item to process
 * @param params.mediaPath - The file system path to the media file
 * @returns Result object with success status and thumbnail URL if available
 */
export async function processThumbnail({
	mediaId,
	mediaPath,
}: {
	mediaId: string;
	mediaPath: string;
}): Promise<boolean> {
	try {
		if (!mediaPath) {
			return false;
		}

		// Check if we need to regenerate or if thumbnail already exists
    const supabase = createSupabase();
    const { data: mediaItem } = await supabase
      .from('media')
      .select('*, media_types(*), exif_data(*), analysis_data(*)')
      .eq('id', mediaId)
      .single();

    if (!mediaItem) {
      // Thumbnail already exists and regeneration wasn't requested
      return false;
    }

		// Process the thumbnail
		const result = await processMediaItemV2(mediaItem);

		if (result.success && result.finalData?.thumbnailUrl) {
			return true;
		}
		// Find the first error in the steps
		const errorStep = result.steps.find((step) => !step.success);
		return  false;
	} catch (error) {
		const errorMessage =
    error instanceof Error ? error.message : 'Unknown error';
    console.log('errorMessage: ', errorMessage)
		return false;
	}
}

/**
 * Enhanced batch thumbnail processing with robust error handling
 *
 * Key improvements:
 * - Never stops processing due to individual failures
 * - Multiple fallback strategies for thumbnail generation
 * - Clear step-by-step processing with detailed logging
 * - Always marks items as processed to prevent infinite loops
 * - Better progress tracking and error reporting
 *
 * @param limit - Maximum number of items to process
 * @param concurrency - Number of items to process in parallel
 */
export async function processBatchThumbnails(limit = 10, concurrency = 3) {
	try {
		const supabase = createSupabase();

		// Find media items that need thumbnail processing
		const { data: mediaItems, error: findError } = await supabase
			.from('media')
			.select('*, media_types!inner(*), exif_data(*), analysis_data(*)')
			.is('is_exif_processed', true)
			.is('is_thumbnail_processed', false)
			.ilike('media_types.mime_type', '%image%')
			.is('media_types.is_ignored', false)
			.limit(limit);

		if (findError) {
			throw new Error(`Failed to find unprocessed items: ${findError.message}`);
		}

		if (!mediaItems || mediaItems.length === 0) {
			return {
				success: true,
				failed: 0,
				processed: 0,
				total: 0,
				message: 'No items to process',
				details: [],
			};
		}

		// Process items with controlled concurrency
		const results = await processInChunks(
			mediaItems,
			processMediaItemV2,
			concurrency,
		);

		// Analyze results
		let successful = 0;
		let failed = 0;
		const processingDetails: any[] = [];

		results.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				const processingResult = result.value;
				processingDetails.push({
					mediaId: processingResult.mediaId,
					success: processingResult.success,
					steps: processingResult.steps,
					finalData: processingResult.finalData,
				});

				if (processingResult.success) {
					successful++;
				} else {
					failed++;
				}
			} else {
				// This should rarely happen since we handle errors within processMediaItemV2
				console.error(
					`[processBatchThumbnails] Unexpected rejection for item ${index}:`,
					result.reason,
				);
				failed++;
				processingDetails.push({
					mediaId: mediaItems[index]?.id || 'unknown',
					success: false,
					steps: [
						{ name: 'Processing', success: false, error: 'Unexpected error' },
					],
				});
			}
		});

		return {
			success: true,
			processed: successful,
			failed,
			total: mediaItems.length,
			message: 'Batch processing completed',
			details: processingDetails,
		};
	} catch (error) {
		console.error(
			'[processBatchThumbnails] Critical error in batch processing:',
			error,
		);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			total: 0,
			failed: 0,
			processed: 0,
			message: 'Batch processing failed due to critical error',
			details: [],
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

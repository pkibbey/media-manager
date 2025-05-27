'use server';

import fs from 'node:fs/promises';
import sharp from 'sharp';
import XXH from 'xxhashjs';
import { processInChunks } from '@/lib/batch-processing';
import { createSupabase } from '@/lib/supabase';
import {
  processNativeThumbnail,
  processRawThumbnail,
  type ThumbnailGenerationResult,
} from '@/lib/thumbnail-generators';
import { storeThumbnail } from '@/lib/thumbnail-storage';
import {
  BACKGROUND_COLOR,
  THUMBNAIL_QUALITY,
  THUMBNAIL_SIZE,
} from '@/lib/consts';
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

    console.log(
      '[generateVisualHashFromFingerprint] dHash generated:',
      hashString,
    );

    return hashString;
  } catch (error) {
    console.error(
      '[generateVisualHashFromFingerprint] Error generating visual hash:',
      error,
    );
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
    } catch (error) {
      console.warn('Sharp fallback method failed:', error);
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
    } catch (error) {
      console.warn('Basic Sharp fallback failed:', error);
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
    } catch (error) {
      console.warn(`Thumbnail strategy ${i + 1} failed:`, error);
    }
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
  let fileBuffer: Buffer;
  try {
    if (!mediaItem.media_path) {
      throw new Error('No media_path available');
    }
    fileBuffer = await fs.readFile(mediaItem.media_path);
    result.steps.push({ name: 'File Read', success: true });
  } catch (error) {
    result.steps.push({
      name: 'File Read',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown file read error',
    });
    return result;
  }

  // Step 2: Generate file hash
  let fileHash: string | null = null;
  try {
    fileHash = XXH.h64(fileBuffer, 0xabcd).toString(16);
    result.steps.push({ name: 'File Hash', success: true, data: fileHash });
  } catch (error) {
    result.steps.push({
      name: 'File Hash',
      success: false,
      error: error instanceof Error ? error.message : 'Hash generation failed',
    });
    // Continue processing even if hash fails
  }

  // Step 3: Generate thumbnail with fallbacks
  let thumbnailBuffer: Buffer;
  let imageFingerprint: Buffer | null = null;
  try {
    const thumbnailResult = await generateThumbnailWithFallbacks(
      mediaItem,
      fileBuffer,
    );
    thumbnailBuffer = thumbnailResult.thumbnailBuffer;
    imageFingerprint = thumbnailResult.imageFingerprint;
    result.steps.push({ name: 'Thumbnail Generation', success: true });
  } catch (error) {
    result.steps.push({
      name: 'Thumbnail Generation',
      success: false,
      error:
        error instanceof Error ? error.message : 'Thumbnail generation failed',
    });
    return result;
  }

  // Step 4: Generate visual hash
  let visualHash: string | null = null;
  try {
    if (imageFingerprint) {
      visualHash = await generateVisualHashFromFingerprint(imageFingerprint);
      result.steps.push({
        name: 'Visual Hash',
        success: !!visualHash,
        data: visualHash,
      });
    } else {
      result.steps.push({
        name: 'Visual Hash',
        success: false,
        error: 'No fingerprint available',
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
    });
    // Continue processing even if visual hash fails
  }

  // Step 5: Store thumbnail
  let thumbnailUrl: string | null = null;
  try {
    const storageResult = await storeThumbnail(mediaItem.id, thumbnailBuffer);
    if (storageResult.success && storageResult.thumbnailUrl) {
      thumbnailUrl = storageResult.thumbnailUrl;
      result.steps.push({
        name: 'Thumbnail Storage',
        success: true,
        data: thumbnailUrl,
      });
    } else {
      result.steps.push({
        name: 'Thumbnail Storage',
        success: false,
        error: 'Storage failed but no error thrown',
      });
      // Continue to mark as processed even if storage fails
    }
  } catch (error) {
    result.steps.push({
      name: 'Thumbnail Storage',
      success: false,
      error: error instanceof Error ? error.message : 'Storage error',
    });
    // Continue to mark as processed even if storage fails
  }

  // Step 6: Update database
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

    result.steps.push({ name: 'Database Update', success: true });
    result.success = true;
    result.finalData = { fileHash, visualHash, thumbnailUrl };
  } catch (error) {
    result.steps.push({
      name: 'Database Update',
      success: false,
      error: error instanceof Error ? error.message : 'DB update failed',
    });

    // Even if the main update fails, try to at least mark as processed
    try {
      const supabase = createSupabase();
      await supabase
        .from('media')
        .update({ is_thumbnail_processed: true })
        .eq('id', mediaItem.id);
      result.steps.push({ name: 'Fallback DB Update', success: true });
    } catch (_fallbackError) {
      result.steps.push({
        name: 'Fallback DB Update',
        success: false,
        error: 'Could not mark as processed',
      });
    }
  }

  return result;
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
  console.log(
    `[processBatchThumbnails] Starting batch processing (limit: ${limit}, concurrency: ${concurrency})`,
  );

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
      console.log(
        '[processBatchThumbnails] No items found for thumbnail processing',
      );
      return {
        success: true,
        failed: 0,
        processed: 0,
        total: 0,
        message: 'No items to process',
        details: [],
      };
    }

    console.log(
      `[processBatchThumbnails] Found ${mediaItems.length} items for processing`,
    );

    // Process items with controlled concurrency
    const results = await processInChunks(
      mediaItems,
      async (mediaItem) => {
        console.log(
          `[processBatchThumbnails] Processing media item: ${mediaItem.id}`,
        );
        const processingResult = await processMediaItemV2(mediaItem);

        if (processingResult.success) {
          console.log(
            `[processBatchThumbnails] ✅ Successfully processed: ${mediaItem.id}`,
          );
        } else {
          console.warn(
            `[processBatchThumbnails] ⚠️  Processing completed with issues: ${mediaItem.id}`,
          );
          console.warn(
            'Failed steps:',
            processingResult.steps.filter((step) => !step.success),
          );
        }

        return processingResult;
      },
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

    console.log(
      `[processBatchThumbnails] Batch completed: ${successful} successful, ${failed} failed`,
    );

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

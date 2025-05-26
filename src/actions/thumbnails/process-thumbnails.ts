'use server';

import fs from 'node:fs/promises';
import XXH from 'xxhashjs';
import { countResults, processInChunks } from '@/lib/batch-processing';
import { createSupabase } from '@/lib/supabase';
import {
  processNativeThumbnail,
  processRawThumbnail,
  type ThumbnailGenerationResult,
} from '@/lib/thumbnail-generators';
import { storeThumbnail } from '@/lib/thumbnail-storage';
import type { MediaWithRelations } from '@/types/media-types';

/**
 * Generates a perceptual hash (dHash) from a raw 16x16 grayscale image fingerprint buffer.
 * dHash compares adjacent pixels to create a hash that's resilient to small changes.
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

/**
 * Generate a thumbnail for a single media item and update its visual hash and file hash
 *
 * @param mediaItem - The media item to process
 * @returns Object with success status and any error message
 */
async function processMediaThumbnail(mediaItem: MediaWithRelations) {
  let generationResult: ThumbnailGenerationResult | null = null;
  let fileBuffer: Buffer;

  try {
    // Read the file buffer once
    if (!mediaItem.media_path) {
      return {
        success: false,
        error: 'No media_path available on media item',
      };
    }
    fileBuffer = await fs.readFile(mediaItem.media_path);
  } catch (fileReadError) {
    return {
      success: false,
      error:
        fileReadError instanceof Error
          ? `Failed to read file: ${fileReadError.message}`
          : 'Failed to read file',
    };
  }

  // Generate file_hash using xxhash (xxh64)
  let fileHash: string | null = null;
  try {
    // Use a fixed seed for deterministic hashing
    fileHash = XXH.h64(fileBuffer, 0xabcd).toString(16);
  } catch (_hashError) {
    fileHash = null;
  }

  try {
    // Choose appropriate thumbnail generation strategy based on media type
    if (mediaItem.media_types?.is_native) {
      generationResult = await processNativeThumbnail(mediaItem, fileBuffer);
    } else {
      generationResult = await processRawThumbnail(mediaItem, fileBuffer);
    }
  } catch (processingError) {
    return {
      success: false,
      error:
        processingError instanceof Error
          ? `Thumbnail/Fingerprint generation failed: ${processingError.message}`
          : 'Thumbnail/Fingerprint generation failed',
    };
  }

  // Process and store visual hash if fingerprint was generated
  let visualHash: string | null = null;
  if (generationResult?.imageFingerprint) {
    visualHash = await generateVisualHashFromFingerprint(
      generationResult.imageFingerprint,
    );
  }

  if (!generationResult?.thumbnailBuffer) {
    return {
      success: false,
      error: 'No thumbnail generated',
    };
  }

  let thumbnailUrl: string | null = null;
  try {
    // Store the thumbnail and get the URL
    const storageResult = await storeThumbnail(
      mediaItem.id,
      generationResult.thumbnailBuffer,
    );
    if (storageResult.success && storageResult.thumbnailUrl) {
      thumbnailUrl = storageResult.thumbnailUrl;
    } else if (!storageResult.success) {
      return storageResult;
    }
  } catch (storageError) {
    return {
      success: false,
      error:
        storageError instanceof Error
          ? `Thumbnail storage failed: ${storageError.message}`
          : 'Thumbnail storage failed',
    };
  }

  // Save visual_hash, file_hash, and thumbnail URL in a single DB update
  try {
    const supabase = createSupabase();
    const updateFields: Record<string, any> = {
      is_thumbnail_processed: true,
    };
    if (visualHash) updateFields.visual_hash = visualHash;
    if (fileHash) updateFields.file_hash = fileHash;
    if (thumbnailUrl) updateFields.thumbnail_url = thumbnailUrl;

    const { error: updateError } = await supabase
      .from('media')
      .update(updateFields)
      .eq('id', mediaItem.id);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update hashes/thumbnail: ${updateError.message}`,
      };
    }
  } catch (dbError) {
    return {
      success: false,
      error:
        dbError instanceof Error
          ? `DB update failed: ${dbError.message}`
          : 'DB update failed',
    };
  }

  return {
    success: true,
    message: 'Thumbnail, visual hash, and file hash processed and saved',
    visualHash,
    fileHash,
    thumbnailUrl,
    error: null,
  };
}

/**
 * Process thumbnails for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @param concurrency - Number of items to process in parallel
 * @returns Object with count of processed items and any errors
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
      };
    }

    // Process items in batches with controlled concurrency
    const results = await processInChunks(
      mediaItems,
      processMediaThumbnail,
      concurrency,
    );

    // Log any rejected promises for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Failed to process item ${index} (mediaId: ${mediaItems[index]?.id}):`,
          result.reason,
        );
      }
    });

    // Count succeeded and failed results
    const { succeeded, failed } = countResults(
      results,
      (value) => value.success,
    );

    return {
      success: true,
      processed: succeeded,
      failed,
      total: mediaItems.length,
      message: 'Batch processing completed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      total: 0,
      failed: 0,
      processed: 0,
      message: 'Batch processing failed',
    };
  }
}

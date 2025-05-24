'use server';

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

/**
 * Generate a thumbnail for a single media item and update its visual hash
 *
 * @param mediaItem - The media item to process
 * @returns Object with success status and any error message
 */
async function processMediaThumbnail(mediaItem: MediaWithRelations) {
  let generationResult: ThumbnailGenerationResult | null = null;

  try {
    console.log('[processMediaThumbnail] Start processing mediaItem', {
      id: mediaItem.id,
      media_types: mediaItem.media_types,
    });
    // Choose appropriate thumbnail generation strategy based on media type
    if (mediaItem.media_types?.is_native) {
      generationResult = await processNativeThumbnail(mediaItem);
    } else {
      generationResult = await processRawThumbnail(mediaItem);
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
  if (generationResult?.imageFingerprint) {
    const visualHash = await generateVisualHashFromFingerprint(
      generationResult.imageFingerprint,
    );
    if (visualHash) {
      try {
        const supabase = createSupabase();
        const { error: updateError } = await supabase
          .from('media')
          .update({ visual_hash: visualHash })
          .eq('id', mediaItem.id);

        if (updateError) {
          console.error(
            `[processMediaThumbnail] Failed to update visual hash for media ${mediaItem.id}:`,
            updateError.message,
          );
          // Note: We are not returning failure for the whole function here,
          // as thumbnail processing might still succeed.
        } else {
          console.log(
            `[processMediaThumbnail] Successfully updated visual hash for media ${mediaItem.id}`,
          );
        }
      } catch (dbError) {
        console.error(
          `[processMediaThumbnail] Exception during visual hash update for media ${mediaItem.id}:`,
          dbError,
        );
      }
    } else {
      console.log(
        `[processMediaThumbnail] No visual hash generated for media ${mediaItem.id} (fingerprint might have been empty or hash generation failed).`,
      );
    }
  } else {
    console.log(
      `[processMediaThumbnail] No image fingerprint available for media ${mediaItem.id}, skipping visual hash.`,
    );
  }

  if (!generationResult?.thumbnailBuffer) {
    return {
      success: false,
      error: 'No thumbnail generated',
    };
  }

  try {
    // Store the thumbnail and update database
    const storageResult = await storeThumbnail(
      mediaItem.id,
      generationResult.thumbnailBuffer,
    );
    console.log(
      `[processMediaThumbnail] Storage result for media ${mediaItem.id}:`,
      storageResult,
    );
    return storageResult; // This determines the primary success/failure of the function
  } catch (storageError) {
    console.error(
      `[processMediaThumbnail] Error storing thumbnail for media ${mediaItem.id}:`,
      storageError,
      {
        mediaItem,
      },
    );
    return {
      success: false,
      error:
        storageError instanceof Error
          ? `Thumbnail storage failed: ${storageError.message}`
          : 'Thumbnail storage failed',
    };
  }
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
      .select(
        '*, media_types!inner(*), exif_data(*), thumbnail_data(*), analysis_data(*)',
      )
      .is('is_exif_processed', true)
      .is('is_thumbnail_processed', false)
      .ilike('media_types.mime_type', '%image%')
      .is('media_types.is_ignored', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      console.log('No items found for thumbnail processing');
      return {
        success: true,
        failed: 0,
        processed: 0,
        total: 0,
        message: 'No items to process',
      };
    }

    console.log(
      `Found ${mediaItems.length} items for thumbnail processing:`,
      mediaItems.map((item) => item.id),
    );

    // Process items in batches with controlled concurrency
    const results = await processInChunks(
      mediaItems,
      async (mediaItem) => {
        console.log(`Processing media item ID: ${mediaItem.id}`);
        const result = await processMediaThumbnail(mediaItem);
        if (result.success) {
          console.log(`Successfully processed media item ID: ${mediaItem.id}`);
        } else {
          console.error(
            `Failed to process media item ID: ${mediaItem.id}`,
            result.error,
          );
        }
        return result;
      },
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

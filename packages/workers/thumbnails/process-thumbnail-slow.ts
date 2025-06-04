import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import fs from 'node:fs/promises';
import { createSupabase } from 'shared';
import { THUMBNAIL_QUALITY, THUMBNAIL_SIZE } from 'shared/consts';
import sharp from 'sharp';
import { storeThumbnail } from './thumbnail-storage';

/**
 * Slow but reliable thumbnail generation using Sharp.
 * This function serves as a fallback when ultra and fast methods fail.
 * It uses Sharp's comprehensive image processing capabilities with enhanced error handling.
 *
 * @param params - Object containing processing parameters
 * @param params.mediaId - The ID of the media item to process
 * @param params.mediaPath - The file system path to the media file
 * @returns Result object with success status and thumbnail URL if available
 */
export async function processThumbnailSlow({
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

    // Check if file exists
    try {
      await fs.access(mediaPath);
    } catch {
      console.warn(`[processThumbnailSlow] File not found: ${mediaPath}`);
      return false;
    }

    // Generate thumbnail using Sharp with comprehensive settings
    const thumbnailBuffer = await sharp(mediaPath)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        fit: 'cover',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: THUMBNAIL_QUALITY,
        progressive: true,
        mozjpeg: true, // Use mozjpeg encoder for better compression
      })
      .toBuffer();

    if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
      console.warn(
        `[processThumbnailSlow] Generated empty thumbnail for: ${mediaPath}`,
      );
      return false;
    }

    // Store thumbnail
    const storageResult = await storeThumbnail({
      mediaId,
      thumbnailBuffer,
      processType: 'slow',
    });

    if (storageResult.success && storageResult.thumbnailUrl) {
      // Update database with thumbnail URL
      const supabase = createSupabase();
      await supabase
        .from('media')
        .update({ thumbnail_url: storageResult.thumbnailUrl })
        .eq('id', mediaId);

      return true;
    }

    return false;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[processThumbnailSlow] Error processing ${mediaPath}:`,
      errorMessage,
    );
    return false;
  }
}

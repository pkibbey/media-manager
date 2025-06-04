import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { createSupabase } from 'shared';
import { THUMBNAIL_QUALITY, THUMBNAIL_SIZE } from 'shared/consts';
import sharp from 'sharp';
import { storeThumbnail } from './thumbnail-storage';

/**
 * Fast thumbnail generation for speed-critical workflows.
 * This function prioritizes speed over accuracy and does not generate hashes or use fallbacks.
 * It uses sharp to quickly resize and save a JPEG thumbnail.
 *
 * @param params - Object containing processing parameters
 * @param params.mediaId - The ID of the media item to process
 * @param params.mediaPath - The file system path to the media file
 * @returns Result object with success status and thumbnail URL if available
 */
export async function processThumbnailFast({
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

    // Fastest thumbnail: just resize and save as JPEG
    const thumbnailBuffer = await sharp(mediaPath)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        fit: 'cover',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    // Store thumbnail
    const storageResult = await storeThumbnail({
      mediaId,
      thumbnailBuffer,
      processType: 'fast',
    });

    if (storageResult.success && storageResult.thumbnailUrl) {
      // Optionally update DB with just the thumbnail URL
      const supabase = createSupabase();
      await supabase
        .from('media')
        .update({ thumbnail_url: storageResult.thumbnailUrl })
        .eq('id', mediaId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

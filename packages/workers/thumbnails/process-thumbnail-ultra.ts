import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import exifr from 'exifr';
import { createSupabase } from 'shared';
import { storeThumbnail } from './thumbnail-storage';

/**
 * Ultra-fast thumbnail generation: prioritizes speed by extracting embedded EXIF thumbnail if available,
 * otherwise falls back to sharp resize. No hashes, no fallbacks, just speed.
 *
 * @param params - Object containing processing parameters
 * @param params.mediaId - The ID of the media item to process
 * @param params.mediaPath - The file system path to the media file
 * @returns Result object with success status and thumbnail URL if available
 */
export async function processThumbnailUltra({
  mediaId,
  mediaPath,
}: {
  mediaId: string;
  mediaPath: string;
}): Promise<boolean> {
  try {
    if (!mediaPath) return false;

    // Use exifr.thumbnail directly on the file path for fastest chunked reading
    const thumbnailBuffer = await exifr.thumbnail(mediaPath);
    if (
      !thumbnailBuffer ||
      !Buffer.isBuffer(thumbnailBuffer) ||
      thumbnailBuffer.length === 0
    ) {
      // Fail fast if no embedded thumbnail
      return false;
    }

    // Store thumbnail
    const storageResult = await storeThumbnail({
      mediaId,
      thumbnailBuffer,
      processType: 'slow',
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

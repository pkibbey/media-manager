'use server';

import { exiftool } from 'exiftool-vendored';
import type { Tags as ExiftoolTags } from 'exiftool-vendored';
import { createSupabase } from 'shared';
import type { MediaWithExif } from 'shared/types';
import { standardizeExif } from './exif-utils';

/**
 * Extract EXIF data from a media item and save it to the database
 *
 * @param mediaItem - The media item to process
 * @param method - The processing method used for tracking
 * @returns Object with extracted EXIF data and success status
 */
export async function processExifSlow(
  mediaItem: Pick<MediaWithExif, 'id' | 'media_path'>,
  method: string,
): Promise<boolean> {
  try {
    const exif = (await exiftool.read(mediaItem.media_path)) as ExiftoolTags;

    if (!exif) {
      return false;
    }

    // Parse EXIF data into standardized format with type safety
    const exifData = standardizeExif(exif, mediaItem.id, method);

    // Save EXIF data to database
    const supabase = createSupabase();

    // Insert/update the EXIF data
    const { error: insertError } = await supabase
      .from('exif_data')
      .upsert(exifData, {
        onConflict: 'media_id',
      });

    if (insertError) {
      throw new Error(`Failed to save EXIF data: ${insertError.message}`);
    }

    return true;
  } catch (processingError) {
    console.error(
      `Error extracting EXIF for media slow ${mediaItem.id}:${mediaItem.media_path.split('/').pop()}`,
      processingError,
    );
    return false;
  }
}

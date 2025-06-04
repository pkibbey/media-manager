'use server';

import { parse } from 'exifr';
import { createSupabase } from 'shared';
import type { ExifrOutput, MediaWithExif } from 'shared/types';
import { exifOptions, standardizeExif } from './exif-utils';

/**
 * Extract EXIF data from a media item using the fast exifr library
 *
 * @param mediaItem - The media item to process
 * @param enableDebug - Optional flag to enable detailed EXIF field debugging
 * @returns Object with extracted EXIF data and success status
 */
export async function processExifFast(
  mediaItem: Pick<MediaWithExif, 'id' | 'media_path'>,
): Promise<boolean> {
  try {
    // Use exifr to parse EXIF data - much faster than exiftool-vendored
    const exif = (await parse(
      mediaItem.media_path,
      exifOptions,
    )) as ExifrOutput;

    if (!exif) {
      return false;
    }

    // Parse EXIF data into standardized format with type safety
    const exifData = standardizeExif(exif, mediaItem.id);

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
      `Error extracting EXIF for media ${mediaItem.id}:`,
      processingError,
    );
    return false;
  }
}

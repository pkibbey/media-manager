'use server';

import ExifReader from 'exifreader';
import sharp from 'sharp';
import { createServer } from '@/lib/supabase';
/**
 * Process EXIF data for a media item
 *
 * @param mediaId - The ID of the media item to process
 * @returns Object with success status and any error message
 */
export async function processExif(mediaId: string) {
  try {
    const supabase = createServer();

    // Get the media item
    const { data: mediaItem, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (mediaError || !mediaItem) {
      throw new Error(
        `Failed to find media item: ${mediaError?.message || 'Not found'}`,
      );
    }

    // Configure Sharp for fast metadata extraction without decoding pixel data
    // Use file path directly instead of loading the full buffer into memory
    const image = sharp(mediaItem.media_path, {
      failOnError: false, // Skip corrupt images gracefully
      sequentialRead: true, // Better for streaming large files
    });

    try {
      // Extract metadata without decoding compressed pixel data
      const metadata = await image.metadata();

      if (!metadata.exif) {
        return {
          success: false,
        };
      }

      const tags = ExifReader.load(metadata.exif);
      console.log('tags: ', tags);

      // Store the normalized EXIF data
      // Use onConflict to ensure upsert correctly matches on file_id
      // // const { error: insertError } = await supabase
      // //   .from('exif_data')
      // //   .upsert(tags, {
      // //     onConflict: 'media_id', // Correctly specify the column to match for conflict resolution
      // //   });

      // if (insertError) {
      //   throw new Error(`Failed to insert EXIF data: ${insertError.message}`);
      // }

      return { success: true };
    } catch (processingError) {
      console.error(
        `Error processing EXIF for media ${mediaId}:`,
        processingError,
      );
      return {
        success: false,
        error:
          processingError instanceof Error
            ? processingError.message
            : 'Unknown processing error',
      };
    }
  } catch (error) {
    console.error('Error processing EXIF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process EXIF data for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @returns Object with count of processed items and any errors
 */
export async function processBatchExif(limit = 10) {
  try {
    const supabase = createServer();

    // Find media items that need EXIF processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('id')
      .eq('exif_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, processed: 0, message: 'No items to process' };
    }

    // Process each item
    const results = await Promise.allSettled(
      mediaItems.map((item) => processExif(item.id)),
    );

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success,
    ).length;
    const failed = results.length - succeeded;

    return {
      success: true,
      processed: succeeded,
      failed,
      total: results.length,
    };
  } catch (error) {
    console.error('Error in batch EXIF processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
    };
  }
}

// /**
//  * Format EXIF date to ISO format
//  *
//  * @param exifDate - Date string in EXIF format
//  * @returns Formatted date string or null
//  */
// function formatExifDate(exifDate: string | undefined): string | null {
//   if (!exifDate) return null;

//   // Common EXIF date format: 2023:05:15 14:30:22
//   const match = exifDate.match(
//     /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
//   );

//   if (match) {
//     try {
//       const [, year, month, day, hour, minute, second] = match;
//       const formattedDate = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
//       // Validate the date by parsing and reformatting
//       return format(parseISO(formattedDate), "yyyy-MM-dd'T'HH:mm:ss");
//     } catch (error) {
//       console.error('Error formatting EXIF date:', error);
//     }
//   }

//   return null;
// }

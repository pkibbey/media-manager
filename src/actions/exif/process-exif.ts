'use server';

import ExifReader from 'exifreader';
import sharp from 'sharp';
import { v4 } from 'uuid';
import { createSupabase } from '@/lib/supabase';
import type { MediaWithExif } from '@/types/media-types';
/**
 * Process EXIF data for a media item
 *
 * @param mediaItem - The media item to process
 * @returns Object with success status and any error message
 */
export async function processExif(mediaItem: MediaWithExif) {
  try {
    const supabase = createSupabase();

    // Use Sharp for fast metadata extraction
    const image = sharp(mediaItem.media_path, {
      failOnError: false, // Skip corrupt images gracefully
      sequentialRead: true, // Better for streaming large files,
      autoOrient: true, // Automatically orient the photo
    });

    try {
      // Extract metadata without decoding compressed pixel data
      const metadata = await image.metadata();

      if (!metadata.exif) {
        console.log(`No EXIF data found for ${mediaItem.id}`);

        const { error } = await setMediaAsProcessed(mediaItem.id);

        if (error) {
          return {
            success: false,
            error: `Failed to mark media as processed: ${error.message}`,
          };
        }

        return {
          success: false,
          message: 'No EXIF data found, marked as processed',
        };
      }

      const tags = ExifReader.load(metadata.exif);
      console.log(
        `EXIF tags found for ${mediaItem.id}: ${Object.keys(tags).length} tags`,
      );

      // Extract useful EXIF data into a structured format
      const exifData = {
        id: v4(),
        media_id: mediaItem.id,
        date_taken: tags.DateTime?.description,
        camera_make: tags.Make?.description,
        camera_model: tags.Model?.description,
        iso: Number.parseInt(tags.ISO?.description || '0', 10),
        focal_length: tags.FocalLength?.description,
        aperture: Number.parseInt(tags.FNumber?.description || '0', 10),
        exposure_time: Number.parseFloat(tags.ExposureTime?.description || '0'),
        gps_latitude: Number.parseFloat(tags.GPSLatitude?.description || '0'),
        gps_longitude: Number.parseFloat(tags.GPSLongitude?.description || '0'),
        raw_exif: JSON.stringify(tags),
        processed_at: new Date().toISOString(),
        height: metadata.height || 0,
        width: metadata.width || 0,
      };

      // Store the normalized EXIF data
      const { error: insertError } = await supabase
        .from('exif_data')
        .upsert(exifData, {
          onConflict: 'media_id', // Correctly specify the column to match for conflict resolution
        });

      if (insertError) {
        throw new Error(`Failed to insert EXIF data: ${insertError.message}`);
      }

      // Update the media item to mark it as processed
      const { error: updateError } = await supabase
        .from('media')
        .update({ exif_processed: true })
        .eq('id', mediaItem.id);

      if (updateError) {
        throw new Error(
          `Failed to update media status: ${updateError.message}`,
        );
      }

      return { success: true };
    } catch (processingError) {
      console.error(
        `Error processing EXIF for media ${mediaItem.id}:`,
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
    const supabase = createSupabase();

    // Find media items that need EXIF processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('*, exif_data(*)')
      .is('exif_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, processed: 0, message: 'No items to process' };
    }

    // Process each item
    const results = await Promise.allSettled(mediaItems.map(processExif));

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

function setMediaAsProcessed(mediaId: string) {
  const supabase = createSupabase();

  return supabase
    .from('media')
    .update({ exif_processed: true })
    .eq('id', mediaId);
}

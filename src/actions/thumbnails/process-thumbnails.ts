'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { ExifTool } from 'exiftool-vendored';
import sharp from 'sharp';
import { v4 } from 'uuid';
import { createSupabase } from '@/lib/supabase';
import type { Media } from '@/types/media-types';

const THUMBNAIL_WIDTH = 244; // Thumbnail width ideal for image analysis
const THUMBNAIL_QUALITY = 80; // JPEG quality (0-100)
const exiftool = new ExifTool();

/**
 * Mark a media item as having its thumbnail processed
 *
 * @param mediaId - The ID of the media item to mark
 * @param thumbnailUrl - Optional URL to the generated thumbnail
 * @returns Object with success or error information
 */
async function setMediaAsThumbnailProcessed(mediaId: string) {
  const supabase = createSupabase();

  const { error } = await supabase
    .from('media')
    .update({ is_thumbnail_processed: true })
    .eq('id', mediaId);

  if (error) {
    console.error(
      `Error marking media ${mediaId} as thumbnail processed:`,
      error,
    );
    return { success: false, error };
  }

  return { success: true };
}

/**
 * Generate a thumbnail for a single media item
 *
 * @param mediaItem - The media item to process
 * @returns Object with success status and any error message
 */
export async function processThumbnail(mediaItem: Media) {
  try {
    const supabase = createSupabase();

    try {
      // Generate unique ID for the thumbnail
      const thumbnailId = v4();
      const thumbnailFilename = `${thumbnailId}.jpg`;
      const tempThumbnailPath = path.join('/tmp', thumbnailFilename);

      // Try to extract thumbnail using ExifTool
      let thumbnailBuffer: Buffer;

      try {
        // Extract embedded thumbnail using ExifTool
        await exiftool.extractThumbnail(
          mediaItem.media_path,
          tempThumbnailPath,
        );

        // Read the thumbnail file
        thumbnailBuffer = await fs.readFile(tempThumbnailPath);

        // Clean up temp file
        await fs.unlink(tempThumbnailPath);
      } catch (extractError) {
        console.log(
          `No embedded thumbnail found for ${mediaItem.id}, falling back to Sharp: ${extractError}`,
        );

        // Fallback to Sharp if ExifTool couldn't extract a thumbnail
        const image = sharp(mediaItem.media_path);
        thumbnailBuffer = await image
          .rotate()
          .resize({
            width: THUMBNAIL_WIDTH,
            height: THUMBNAIL_WIDTH,
            withoutEnlargement: true,
            fit: 'cover',
          })
          .jpeg({ quality: THUMBNAIL_QUALITY })
          .toBuffer();
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailFilename, thumbnailBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000', // Cache for a year
        });

      if (uploadError) {
        throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
      }

      // Get public URL for the thumbnail
      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(thumbnailFilename);

      const thumbnailUrl = urlData.publicUrl;

      // Add the thumbnail to the thumbnail_data table
      const { error: insertError } = await supabase
        .from('thumbnail_data')
        .insert({
          id: v4(),
          created_date: new Date().toISOString(),
          media_id: mediaItem.id,
          thumbnail_url: thumbnailUrl,
        });

      if (insertError) {
        throw new Error(
          `Failed to insert thumbnail data: ${insertError.message}`,
        );
      }

      // Update the media item with the thumbnail URL
      const { error: updateError } = await setMediaAsThumbnailProcessed(
        mediaItem.id,
      );

      if (updateError) {
        throw new Error(
          `Failed to update media item with thumbnail URL: ${updateError.message}`,
        );
      }

      return {
        success: true,
        thumbnailUrl,
      };
    } catch (processingError) {
      console.error(
        `Error generating thumbnail for media ${mediaItem.id}:`,
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
    console.error('Error in generateThumbnail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process thumbnails for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @returns Object with count of processed items and any errors
 */
export async function processBatchThumbnails(limit = 10) {
  try {
    const supabase = createSupabase();

    // Find media items that need thumbnail processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('*')
      .is('is_thumbnail_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, processed: 0, message: 'No items to process' };
    }

    // Process each item
    const results = await Promise.allSettled(mediaItems.map(processThumbnail));

    const succeeded = results.filter(
      (result) => result.status === 'fulfilled' && result.value.success,
    ).length;

    const failed = results.filter(
      (result) =>
        result.status === 'rejected' ||
        (result.status === 'fulfilled' && !result.value.success),
    ).length;

    return {
      success: true,
      processed: succeeded,
      failed,
      total: mediaItems.length,
    };
  } catch (error) {
    console.error('Error in processBatchThumbnails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

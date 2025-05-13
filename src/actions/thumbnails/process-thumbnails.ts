'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { ExifTool } from 'exiftool-vendored';
import sharp from 'sharp';
import { v4 } from 'uuid';
import {
  BACKGROUND_COLOR,
  THUMBNAIL_QUALITY,
  THUMBNAIL_SIZE,
} from '@/lib/consts';
import { convertRawThumbnail, processRawWithDcraw } from '@/lib/raw-processor';
import { createSupabase } from '@/lib/supabase';
import type { MediaWithRelations } from '@/types/media-types';
import { setMediaAsThumbnailProcessed } from './set-media-as-thumbnail-processed';

// Helper function to check if a file is a Nikon NEF Raw file
async function isCameraRawFile(mime_type?: string | null): Promise<boolean> {
  if (!mime_type) {
    return false;
  }

  // Currently checks for TIFF and Nikon NEF formats
  // TODO: Add more camera raw formats as needed
  return (
    mime_type.startsWith('image/tiff') ||
    mime_type.startsWith('image/x-nikon-nef')
  );
}

/**
 * Generate a thumbnail for a single media item
 *
 * @param mediaItem - The media item to process
 * @returns Object with success status and any error message
 */
async function processMediaThumbnail(mediaItem: MediaWithRelations) {
  try {
    const supabase = createSupabase();
    // Create a new ExifTool instance for this operation
    const exiftool = new ExifTool();

    try {
      // Generate unique ID for the thumbnail
      const thumbnailId = v4();
      const thumbnailFilename = `${thumbnailId}.jpg`;
      const tempThumbnailPath = path.join('/tmp', thumbnailFilename);

      // Try to extract thumbnail using ExifTool
      let thumbnailBuffer: Buffer;

      const isRawFile = await isCameraRawFile(mediaItem.media_types?.mime_type);

      // Special handling for Nikon NEF files
      if (isRawFile) {
        try {
          // Use dcraw to extract high-quality JPEG from NEF file
          thumbnailBuffer = await processRawWithDcraw(mediaItem.media_path);

          // Resize to fit our thumbnail dimensions
          thumbnailBuffer = await sharp(thumbnailBuffer)
            .rotate()
            .resize({
              width: THUMBNAIL_SIZE,
              height: THUMBNAIL_SIZE,
              withoutEnlargement: true,
              fit: 'contain',
              background: BACKGROUND_COLOR,
            })
            .jpeg({ quality: THUMBNAIL_QUALITY })
            .toBuffer();
        } catch (rawProcessError) {
          console.error(
            'Error processing NEF with dcraw, trying fallback:',
            rawProcessError,
          );

          // Fallback to alternative dcraw method
          try {
            thumbnailBuffer = await convertRawThumbnail(mediaItem.media_path);

            // Resize to fit thumbnail dimensions
            thumbnailBuffer = await sharp(thumbnailBuffer)
              .resize({
                width: THUMBNAIL_SIZE,
                height: THUMBNAIL_SIZE,
                withoutEnlargement: true,
                fit: 'contain',
                background: BACKGROUND_COLOR,
              })
              .jpeg({ quality: THUMBNAIL_QUALITY })
              .toBuffer();
          } catch (alternativeRawError) {
            console.error(
              'Error with alternative RAW processing, using original method:',
              alternativeRawError,
            );
            // Continue to original method if both RAW approaches fail
            throw new Error(
              'Raw processing failed, falling back to standard methods',
            );
          }
        }
      } else {
        // Original method for non-NEF files
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
        } catch (_extractError) {
          // Fallback to Sharp if ExifTool couldn't extract a thumbnail
          const image = sharp(mediaItem.media_path);
          thumbnailBuffer = await image
            .rotate()
            .resize({
              width: THUMBNAIL_SIZE,
              height: THUMBNAIL_SIZE,
              withoutEnlargement: true,
              fit: 'contain',
              background: BACKGROUND_COLOR,
            })
            .jpeg({ quality: THUMBNAIL_QUALITY })
            .toBuffer();
        }
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
      // Make sure to clean up resources in case of error
      await exiftool.end();
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
      .select(
        '*, media_types(*), exif_data(*), thumbnail_data(*), analysis_data(*)',
      )
      .is('is_thumbnail_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, processed: 0, message: 'No items to process' };
    }

    // Process each item
    const results = await Promise.allSettled(
      mediaItems.map(processMediaThumbnail),
    );

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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

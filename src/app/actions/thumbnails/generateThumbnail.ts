'use server';

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { THUMBNAIL_SIZE } from '@/lib/consts';
import {
  markProcessingError,
  markProcessingSuccess,
} from '@/lib/processing-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ThumbnailGenerationResponse } from '@/types/thumbnail-types';
import { convertHeicToJpeg } from './convertHeicToJpeg';

/**
 * Generate and upload a thumbnail for a single media item
 */
export async function generateThumbnail(mediaId: string): Promise<
  ThumbnailGenerationResponse & {
    thumbnailUrl?: string;
    fileName?: string;
  }
> {
  try {
    const supabase = createServerSupabaseClient();

    // Get the media item details
    const { data: mediaItem, error } = await supabase
      .from('media_items')
      .select('*, file_types!inner(*)')
      .in('file_types.category', ['image'])
      .eq('file_types.ignore', false)
      .eq('id', mediaId)
      .single();

    if (error) throw error;

    // Check if file exists
    try {
      await fs.access(mediaItem.file_path);
    } catch (error) {
      console.error(
        `[Thumbnail] File not found: ${mediaItem.file_path} - ${error}`,
      );

      // Update processing state using helper function
      await markProcessingError({
        mediaItemId: mediaId,
        type: 'thumbnail',
        error: 'File not found',
      });

      return {
        success: false,
        message: `File not found: ${mediaItem.file_path}`,
      };
    }

    let thumbnailBuffer: Buffer;

    try {
      // Special handling for HEIC images using our new multi-method approach
      if (mediaItem.file_types?.extension === 'heic') {
        // Create a temporary file path for the converted JPEG
        const tempDir = path.dirname(mediaItem.file_path);
        const tempFileName = `${path.basename(mediaItem.file_path, '.heic')}_temp.jpg`;
        const tempOutputPath = path.join(tempDir, tempFileName);

        // Convert HEIC to JPEG using our robust multi-method converter
        const jpegBuffer = await convertHeicToJpeg(
          mediaItem.file_path,
          tempOutputPath,
        );

        // Use sharp to create thumbnail from the JPEG buffer
        thumbnailBuffer = await sharp(jpegBuffer, { failOnError: false })
          .rotate()
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
      }
      // Special handling for TIFF files that might cause errors
      else if (
        mediaItem.file_types?.extension === 'tiff' ||
        mediaItem.file_types?.extension === 'tif'
      ) {
        try {
          // First attempt: try with tiff-specific options
          thumbnailBuffer = await sharp(mediaItem.file_path, {
            limitInputPixels: 30000 * 30000,
            failOnError: false,
            pages: 0, // Only read the first page of multi-page TIFFs
          })
            .rotate()
            .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
              fit: 'cover',
              fastShrinkOnLoad: true,
            })
            .webp({ quality: 80, effort: 2 })
            .toBuffer();
        } catch (tiffError) {
          console.warn(
            `[Thumbnail] First TIFF approach failed for ${mediaItem.file_path}, trying fallback method`,
          );

          // If the normal approach fails, try using ImageMagick if available
          if (process.platform === 'darwin' || process.platform === 'linux') {
            const execAsync = promisify(exec);
            const tempDir = path.dirname(mediaItem.file_path);
            const tempFileName = `${path.basename(mediaItem.file_path, path.extname(mediaItem.file_path))}_temp.jpg`;
            const tempOutputPath = path.join(tempDir, tempFileName);

            try {
              // Try ImageMagick
              await execAsync(
                `magick convert "${mediaItem.file_path}[0]" -quality 90 "${tempOutputPath}"`,
              );
              const jpegBuffer = await fs.readFile(tempOutputPath);

              // Create thumbnail from the JPEG
              thumbnailBuffer = await sharp(jpegBuffer, { failOnError: false })
                .rotate()
                .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
                .webp({ quality: 80 })
                .toBuffer();

              // Clean up temp file
              await fs.unlink(tempOutputPath).catch(console.error);
            } catch (magickError) {
              console.error(
                '[Thumbnail] ImageMagick TIFF conversion failed:',
                magickError,
              );
              // Re-throw to be caught by outer catch block
              throw new Error(
                `TIFF processing failed: ${magickError instanceof Error ? magickError.message : 'Unknown error'}`,
              );
            }
          } else {
            // If no fallback available, re-throw the error
            throw tiffError;
          }
        }
      } else {
        // For all other image formats, use Sharp directly with enhanced error handling
        thumbnailBuffer = await sharp(mediaItem.file_path, {
          limitInputPixels: 30000 * 30000, // Allow messageably large images
          failOnError: false, // Don't fail on corrupt images or unsupported features
        })
          .rotate()
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
            fit: 'cover',
            fastShrinkOnLoad: true, // Enable fast shrink optimization
          })
          .webp({ quality: 80, effort: 2 }) // Lower effort = faster processing
          .toBuffer();
      }
    } catch (sharpError) {
      console.error(
        `[Thumbnail] Error generating thumbnail for ${mediaItem.file_path}:`,
        sharpError,
      );

      // Mark as error using helper function
      await markProcessingError({
        mediaItemId: mediaId,
        type: 'thumbnail',
        error: sharpError,
      });

      return {
        success: false,
        message: `Error generating thumbnail: ${sharpError instanceof Error ? sharpError.message : 'Processing error'}`,
        fileName: mediaItem.file_name,
      };
    }

    // Upload to Supabase Storage
    const fileName = `${mediaId}_thumb.webp`;

    try {
      const { error: storageError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, thumbnailBuffer, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (storageError) {
        console.error(
          `[Thumbnail] Error uploading thumbnail to storage for ${mediaItem.file_path}:`,
          storageError,
        );

        // Mark as error using helper function
        await markProcessingError({
          mediaItemId: mediaId,
          type: 'thumbnail',
          error: `Storage upload failed: ${storageError.message}`,
        });

        return {
          success: false,
          message: `Failed to upload thumbnail: ${storageError.message}`,
          fileName: mediaItem.file_name,
        };
      }
    } catch (uploadError) {
      console.error(
        `[Thumbnail] Exception during thumbnail upload for ${mediaItem.file_path}:`,
        uploadError,
      );

      // Mark as upload error using helper function
      await markProcessingError({
        mediaItemId: mediaId,
        type: 'thumbnail',
        error: 'Upload exception',
      });

      return {
        success: false,
        message: `Exception during upload: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
        fileName: mediaItem.file_name,
      };
    }

    // Get the public URL for the uploaded thumbnail
    const { data: publicUrlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(fileName);

    const thumbnailUrl = publicUrlData.publicUrl;

    // Update the media_items table with the thumbnail path FIRST
    const { error: updateMediaItemError } = await supabase
      .from('media_items')
      .update({ thumbnail_path: thumbnailUrl })
      .eq('id', mediaId);

    if (updateMediaItemError) {
      console.error(
        `[Thumbnail] Error updating media_items table for ${mediaId}:`,
        updateMediaItemError,
      );
      // Attempt to delete the potentially orphaned thumbnail from storage
      await supabase.storage.from('thumbnails').remove([fileName]);

      // Mark as error using helper function
      await markProcessingError({
        mediaItemId: mediaId,
        type: 'thumbnail',
        error: 'Failed to update media_items table',
      });

      return {
        success: false,
        message: `Failed to update media item record: ${updateMediaItemError.message}`,
        fileName: mediaItem.file_name,
      };
    }

    // Update the processing state with success status using helper function
    try {
      await markProcessingSuccess({
        mediaItemId: mediaId,
        type: 'thumbnail',
        message: 'Thumbnail generated successfully',
      });
    } catch (updateProcessingStateError) {
      console.error(
        `[Thumbnail] Error updating processing_states for ${mediaId}:`,
        updateProcessingStateError,
      );

      // Don't try to upsert again - that would cause another unique constraint violation
      // Instead, just log the error and return

      // Return success=true because the thumbnail IS available, despite the state tracking issue.
      return {
        success: true, // Thumbnail is generated and linked
        message: 'Thumbnail generated, but failed to update processing state.',
        thumbnailUrl,
        fileName: mediaItem.file_name,
      };
    }

    return {
      success: true,
      message: 'Thumbnail generated and stored successfully',
      thumbnailUrl,
      fileName: mediaItem.file_name,
    };
  } catch (error: any) {
    console.error('[Thumbnail] Error generating thumbnail:', error);
    // Try to mark as error in processing_states table using helper function
    try {
      await markProcessingError({
        mediaItemId: mediaId,
        type: 'thumbnail',
        error: 'Unhandled exception',
      });
    } catch (dbError) {
      console.error(
        '[Thumbnail] Failed to mark item as error after exception:',
        dbError,
      );
    }

    return {
      success: false,
      message: `Error generating thumbnail: ${error.message}`,
    };
  }
}

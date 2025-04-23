'use server';

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { LARGE_FILE_THRESHOLD, THUMBNAIL_SIZE } from '@/lib/consts';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isSkippedLargeFile, excludeIgnoredFileTypes } from '@/lib/utils';
import type {
  ThumbnailGenerationOptions,
  ThumbnailGenerationResponse,
} from '@/types/thumbnail-types';
import { convertHeicToJpeg } from './convertHeicToJpeg';

/**
 * Generate and upload a thumbnail for a single media item
 */
export async function generateThumbnail(
  mediaId: string,
  options: ThumbnailGenerationOptions = {},
): Promise<
  ThumbnailGenerationResponse & {
    thumbnailUrl?: string;
    skipped?: boolean;
    skippedReason?: string;
    fileName?: string;
  }
> {
  // Only log the start of thumbnail generation if in debug mode
  const { skipLargeFiles = false } = options;

  try {
    const supabase = createServerSupabaseClient();

    // Get the media item details
    const { data: mediaItem, error } = await excludeIgnoredFileTypes(
      supabase
        .from('media_items')
        .select('*, file_types!inner(*)')
        .eq('id', mediaId)
        .eq('file_types.category', 'image')
    ).single();

    if (error || !mediaItem) {
      console.error(`[Thumbnail] Error fetching media item ${mediaId}:`, error);
      return {
        success: false,
        message: `Failed to fetch media item: ${error?.message || 'Not found'}`,
      };
    }

    // Check if file exists
    try {
      await fs.access(mediaItem.file_path);
    } catch (error) {
      console.error(
        `[Thumbnail] File not found: ${mediaItem.file_path} - ${error}`,
      );

      // Update processing state in processing_states table
      await supabase.from('processing_states').upsert(
        {
          media_item_id: mediaId,
          type: 'thumbnail',
          status: 'error',
          processed_at: new Date().toISOString(),
          error_message: 'File not found',
        },
        {
          onConflict: 'media_item_id,type',
          ignoreDuplicates: false,
        },
      );

      return {
        success: false,
        message: `File not found: ${mediaItem.file_path}`,
      };
    }

    // Check if file is too large and we should skip it
    if (skipLargeFiles) {
      try {
        const stats = await fs.stat(mediaItem.file_path);

        if (isSkippedLargeFile(stats.size)) {
          // Mark as skipped in processing_states table
          await supabase.from('processing_states').upsert(
            {
              media_item_id: mediaId,
              type: 'thumbnail',
              status: 'skipped',
              processed_at: new Date().toISOString(),
              error_message: `Large file (over ${Math.round(LARGE_FILE_THRESHOLD / (1024 * 1024))}MB)`,
            },
            {
              onConflict: 'media_item_id,type',
              ignoreDuplicates: false,
            },
          );

          return {
            success: true,
            skipped: true,
            skippedReason: 'large_file',
            message: `Skipped large file (over ${LARGE_FILE_THRESHOLD / (1024 * 1024)}MB): ${mediaItem.file_name}`,
            fileName: mediaItem.file_name,
          };
        }
      } catch (statError) {
        console.error(
          `[Thumbnail] Error checking file size for ${mediaItem.file_path}:`,
          statError,
        );
      }
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
          limitInputPixels: 30000 * 30000, // Allow reasonably large images
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

      // Mark as error in processing_states table
      const errorMessage =
        sharpError instanceof Error ? sharpError.message : 'Processing error';

      await supabase.from('processing_states').upsert(
        {
          media_item_id: mediaId,
          type: 'thumbnail',
          status: 'error',
          processed_at: new Date().toISOString(),
          error_message: errorMessage,
        },
        {
          onConflict: 'media_item_id,type',
          ignoreDuplicates: false,
        },
      );

      return {
        success: false,
        message: `Error generating thumbnail: ${errorMessage}`,
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

        // Mark as error in processing_states table
        await supabase.from('processing_states').upsert(
          {
            media_item_id: mediaId,
            type: 'thumbnail',
            status: 'error',
            processed_at: new Date().toISOString(),
            error_message: 'Storage upload failed',
          },
          {
            onConflict: 'media_item_id,type',
            ignoreDuplicates: false,
          },
        );

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

      // Mark as upload error in processing_states table
      await supabase.from('processing_states').upsert(
        {
          media_item_id: mediaId,
          type: 'thumbnail',
          status: 'error',
          processed_at: new Date().toISOString(),
          error_message: 'Upload exception',
        },
        {
          onConflict: 'media_item_id,type',
          ignoreDuplicates: false,
        },
      );

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

      // Mark as error in processing_states table
      await supabase.from('processing_states').upsert(
        {
          media_item_id: mediaId,
          type: 'thumbnail',
          status: 'error',
          processed_at: new Date().toISOString(),
          error_message: 'Failed to update media_items table',
        },
        {
          onConflict: 'media_item_id,type',
          ignoreDuplicates: false,
        },
      );

      return {
        success: false,
        message: `Failed to update media item record: ${updateMediaItemError.message}`,
        fileName: mediaItem.file_name,
      };
    }

    // Update the processing state in processing_states table with success status
    const { error: updateProcessingStateError } = await supabase
      .from('processing_states')
      .upsert(
        {
          media_item_id: mediaId,
          type: 'thumbnail',
          status: 'success',
          processed_at: new Date().toISOString(),
          // Clear any previous error message on success
          error_message: null,
        },
        {
          onConflict: 'media_item_id,type',
          ignoreDuplicates: false,
        },
      );

    if (updateProcessingStateError) {
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
    // Try to mark as error in processing_states table
    try {
      const supabase = createServerSupabaseClient();
      await supabase.from('processing_states').upsert(
        {
          media_item_id: mediaId,
          type: 'thumbnail',
          status: 'error',
          processed_at: new Date().toISOString(),
          error_message: 'Unhandled exception',
        },
        {
          onConflict: 'media_item_id,type',
          ignoreDuplicates: false,
        },
      );
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

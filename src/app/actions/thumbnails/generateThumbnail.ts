'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { LARGE_FILE_THRESHOLD, THUMBNAIL_SIZE } from '@/lib/consts';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isSkippedLargeFile } from '@/lib/utils';
import type {
  ThumbnailOptions,
  ThumbnailResult,
} from '@/types/thumbnail-types';
import sharp from 'sharp';
import { convertHeicToJpeg } from './convertHeicToJpeg';

/**
 * Generate and upload a thumbnail for a single media item
 */
export async function generateThumbnail(
  mediaId: string,
  options: ThumbnailOptions = {},
): Promise<
  ThumbnailResult & {
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
    const { data: mediaItem, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (error || !mediaItem) {
      console.error(`[Thumbnail] Error fetching media item ${mediaId}:`, error);
      return {
        success: false,
        message: `Failed to fetch media item: ${error?.message || 'Not found'}`,
        filePath: mediaId, // At least return the media ID for error tracking
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
      await supabase.from('processing_states').upsert({
        media_item_id: mediaId,
        type: 'thumbnail',
        status: 'error',
        processed_at: new Date().toISOString(),
        error_message: 'File not found',
      });

      return {
        success: false,
        message: `File not found: ${mediaItem.file_path}`,
        filePath: mediaItem.file_path,
      };
    }

    // Check if file is too large and we should skip it
    if (skipLargeFiles) {
      try {
        const stats = await fs.stat(mediaItem.file_path);

        if (isSkippedLargeFile(stats.size)) {
          // Mark as skipped in processing_states table
          await supabase.from('processing_states').upsert({
            media_item_id: mediaId,
            type: 'thumbnail',
            status: 'skipped',
            processed_at: new Date().toISOString(),
            error_message: `Large file (over ${Math.round(LARGE_FILE_THRESHOLD / (1024 * 1024))}MB)`,
          });

          return {
            success: true,
            skipped: true,
            skippedReason: 'large_file',
            message: `Skipped large file (over ${LARGE_FILE_THRESHOLD / (1024 * 1024)}MB): ${mediaItem.file_name}`,
            filePath: mediaItem.file_path,
            fileName: mediaItem.file_name,
          };
        }
      } catch (statError) {
        console.error(
          `[Thumbnail] Error checking file size for ${mediaItem.file_path}:`,
          statError,
        );
        // Continue with processing if we can't get the file stats
      }
    }

    // Only process images for now
    const extension = path
      .extname(mediaItem.file_path)
      .substring(1)
      .toLowerCase();

    const supportedImageFormats = [
      'jpg',
      'jpeg',
      'png',
      'webp',
      'gif',
      'tiff',
      'tif',
      'heic',
      'avif',
      'bmp',
    ];

    if (!supportedImageFormats.includes(extension)) {
      // Mark as unsupported in processing_states table
      await supabase.from('processing_states').upsert({
        media_item_id: mediaId,
        type: 'thumbnail',
        status: 'unsupported',
        processed_at: new Date().toISOString(),
        error_message: `Unsupported format: ${extension}`,
      });

      return {
        success: false,
        message: `File type not supported for thumbnails: ${extension}`,
        filePath: mediaItem.file_path,
        fileName: mediaItem.file_name,
        fileType: extension,
      };
    }

    let thumbnailBuffer: Buffer;

    try {
      if (extension === 'heic') {
        // Special handling for HEIC images using our new multi-method approach
        console.error(
          `[Thumbnail] Processing HEIC image: ${mediaItem.file_path}`,
        );

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
        thumbnailBuffer = await sharp(jpegBuffer)
          .rotate()
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        // For all other image formats, use Sharp directly
        thumbnailBuffer = await sharp(mediaItem.file_path, {
          limitInputPixels: 30000 * 30000, // Allow reasonably large images
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

      await supabase.from('processing_states').upsert({
        media_item_id: mediaId,
        type: 'thumbnail',
        status: 'error',
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
      });

      return {
        success: false,
        message: `Error generating thumbnail: ${errorMessage}`,
        filePath: mediaItem.file_path,
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
        await supabase.from('processing_states').upsert({
          media_item_id: mediaId,
          type: 'thumbnail',
          status: 'error',
          processed_at: new Date().toISOString(),
          error_message: 'Storage upload failed',
        });

        return {
          success: false,
          message: `Failed to upload thumbnail: ${storageError.message}`,
          filePath: mediaItem.file_path,
          fileName: mediaItem.file_name,
        };
      }
    } catch (uploadError) {
      console.error(
        `[Thumbnail] Exception during thumbnail upload for ${mediaItem.file_path}:`,
        uploadError,
      );

      // Mark as upload error in processing_states table
      await supabase.from('processing_states').upsert({
        media_item_id: mediaId,
        type: 'thumbnail',
        status: 'error',
        processed_at: new Date().toISOString(),
        error_message: 'Upload exception',
      });

      return {
        success: false,
        message: `Exception during upload: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
        filePath: mediaItem.file_path,
        fileName: mediaItem.file_name,
      };
    }

    // Get the public URL for the uploaded thumbnail
    const { data: publicUrlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(fileName);

    const thumbnailUrl = publicUrlData.publicUrl;

    // Update the processing state in processing_states table with success status and path
    const { error: updateError } = await supabase
      .from('processing_states')
      .upsert({
        media_item_id: mediaId,
        type: 'thumbnail',
        status: 'success',
        processed_at: new Date().toISOString(),
        metadata: { path: thumbnailUrl },
      });

    if (updateError) {
      console.error(
        `[Thumbnail] Error updating media item ${mediaId}:`,
        updateError,
      );

      // Even though we successfully generated and uploaded the thumbnail,
      // we couldn't update the record, so mark it with an error
      await supabase.from('processing_states').upsert({
        media_item_id: mediaId,
        type: 'thumbnail',
        status: 'error',
        processed_at: new Date().toISOString(),
        error_message: 'Record update failed',
      });

      return {
        success: false,
        message: `Failed to update media item: ${updateError.message}`,
        filePath: mediaItem.file_path,
        fileName: mediaItem.file_name,
      };
    }

    return {
      success: true,
      message: 'Thumbnail generated and stored successfully',
      thumbnailUrl,
      filePath: mediaItem.file_path,
      fileName: mediaItem.file_name,
      fileType: extension,
    };
  } catch (error: any) {
    console.error('[Thumbnail] Error generating thumbnail:', error);
    // Try to mark as error in processing_states table
    try {
      const supabase = createServerSupabaseClient();
      await supabase.from('processing_states').upsert({
        media_item_id: mediaId,
        type: 'thumbnail',
        status: 'error',
        processed_at: new Date().toISOString(),
        error_message: 'Unhandled exception',
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
      filePath: '',
    };
  }
}

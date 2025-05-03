'use server';

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Tags } from 'exifreader';
import sharp from 'sharp';
import { THUMBNAIL_SIZE } from '@/lib/consts';
import {
  markProcessingError,
  markProcessingSuccess,
} from '@/lib/processing-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem } from '@/types/db-types';
import type { ThumbnailGenerationResponse } from '@/types/thumbnail-types';
import type { Method } from '@/types/unified-stats';
import { convertHeicToJpeg } from './convert-heic-to-jpeg';

/**
 * Generate and upload a thumbnail for a single media item
 */
export async function generateThumbnail(
  mediaId: string,
  options: { method?: Method } = {},
): Promise<
  ThumbnailGenerationResponse & {
    thumbnailUrl?: string;
    fileName?: string;
  }
> {
  const { method = 'default' } = options;
  console.log(`[Thumbnail] Starting generateThumbnail for mediaId: ${mediaId} with method: ${method}`);

  try {
    const supabase = createServerSupabaseClient();

    // Get the media item details
    console.log(`[Thumbnail] Fetching media item details for ID: ${mediaId}`);
    const { data: mediaItem, error } = await supabase
      .from('media_items')
      .select('*, file_types!inner(*), exif_data(*)')
      .in('file_types.category', ['image'])
      .is('file_types.ignore', false)
      .eq('id', mediaId)
      .single();

    if (error) {
      console.error(`[Thumbnail] Error fetching media item: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }

    console.log(`[Thumbnail] Retrieved media item: ${mediaItem.file_name} (${mediaItem.file_path})`);
    console.log(`[Thumbnail] File type: ${mediaItem.file_types?.extension}, size: ${mediaItem.size_bytes || 'unknown'} bytes`);

    // Check if file exists
    try {
      await fs.access(mediaItem.file_path);
      console.log(`[Thumbnail] File exists at path: ${mediaItem.file_path}`);
    } catch (error) {
      console.error(
        `[Thumbnail] File not found: ${mediaItem.file_path} - ${error}`,
      );

      // Update processing state using helper function
      await markProcessingError({
        mediaItemId: mediaId,
        progressType: 'thumbnail',
        errorMessage: 'File not found',
      });

      return {
        success: false,
        message: `File not found: ${mediaItem.file_path}`,
      };
    }

    let thumbnailBuffer: Buffer;

    try {
      console.log(`[Thumbnail] Starting to generate thumbnail buffer using '${method}' method for ${mediaItem.file_name}`);
      
      if (method === 'embedded-preview') {
        // Try to extract embedded preview from EXIF data
        console.log(`[Thumbnail] Attempting to use embedded preview from EXIF for ${mediaItem.file_name}`);
        thumbnailBuffer = await generateEmbeddedPreviewThumbnail(mediaItem);
      } else if (method === 'downscale-only') {
        // Simple downscaling without additional processing
        console.log(`[Thumbnail] Using downscale-only method for ${mediaItem.file_name}`);
        thumbnailBuffer = await generateDownscaleThumbnail(mediaItem);
      } else {
        // Default method - full processing
        console.log(`[Thumbnail] Using default full processing method for ${mediaItem.file_name}`);
        thumbnailBuffer = await generateDefaultThumbnail(mediaItem);
      }
      
      console.log(`[Thumbnail] Successfully generated thumbnail buffer for ${mediaItem.file_name}, size: ${thumbnailBuffer.length} bytes`);
    } catch (thumbnailError) {
      console.error(
        `[Thumbnail] Error generating thumbnail for ${mediaItem.file_path} with method ${method}:`,
        thumbnailError,
      );

      // Mark as error using helper function
      await markProcessingError({
        mediaItemId: mediaId,
        progressType: 'thumbnail',
        errorMessage: String(thumbnailError),
      });

      return {
        success: false,
        message: `Error generating thumbnail with ${method} method: ${thumbnailError instanceof Error ? thumbnailError.message : 'Processing error'}`,
        fileName: mediaItem.file_name,
      };
    }

    // Upload to Supabase Storage
    const fileName = `${mediaId}_thumb.webp`;
    console.log(`[Thumbnail] Starting upload to Supabase storage with filename: ${fileName}`);

    try {
      console.log(`[Thumbnail] Uploading buffer of size ${thumbnailBuffer.length} bytes to storage bucket 'thumbnails'`);
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
          progressType: 'thumbnail',
          errorMessage: `Storage upload failed: ${storageError.message}`,
        });

        return {
          success: false,
          message: `Failed to upload thumbnail: ${storageError.message}`,
          fileName: mediaItem.file_name,
        };
      }
      console.log(`[Thumbnail] Successfully uploaded thumbnail to storage for ${mediaItem.file_name}`);
    } catch (uploadError) {
      console.error(
        `[Thumbnail] Exception during thumbnail upload for ${mediaItem.file_path}:`,
        uploadError,
      );

      // Mark as upload error using helper function
      await markProcessingError({
        mediaItemId: mediaId,
        progressType: 'thumbnail',
        errorMessage: 'Upload exception',
      });

      return {
        success: false,
        message: `Exception during upload: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
        fileName: mediaItem.file_name,
      };
    }

    // Get the public URL for the uploaded thumbnail
    console.log(`[Thumbnail] Getting public URL for uploaded thumbnail: ${fileName}`);
    const { data: publicUrlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(fileName);

    const thumbnailUrl = publicUrlData.publicUrl;
    console.log(`[Thumbnail] Public URL generated: ${thumbnailUrl}`);

    // Update the media_items table with the thumbnail path FIRST
    console.log(`[Thumbnail] Updating media_items table with thumbnail URL for media ID: ${mediaId}`);
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
      console.log(`[Thumbnail] Removed orphaned thumbnail from storage after DB update failure: ${fileName}`);

      // Mark as error using helper function
      await markProcessingError({
        mediaItemId: mediaId,
        progressType: 'thumbnail',
        errorMessage: 'Failed to update media_items table',
      });

      return {
        success: false,
        message: `Failed to update media item record: ${updateMediaItemError.message}`,
        fileName: mediaItem.file_name,
      };
    }
    console.log(`[Thumbnail] Successfully updated media_items table with thumbnail URL for ${mediaItem.file_name}`);

    // Update the processing state with success status using helper function
    try {
      console.log(`[Thumbnail] Marking processing as successful for media ID: ${mediaId}`);
      await markProcessingSuccess({
        mediaItemId: mediaId,
        progressType: 'thumbnail',
        errorMessage: `Thumbnail generated successfully using ${method} method`,
      });
      console.log(`[Thumbnail] Successfully updated processing state to 'complete' for ${mediaItem.file_name}`);
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

    console.log(`[Thumbnail] Complete thumbnail generation process succeeded for ${mediaItem.file_name}`);
    return {
      success: true,
      message: `Thumbnail generated and stored successfully using ${method} method`,
      thumbnailUrl,
      fileName: mediaItem.file_name,
    };
  } catch (error: any) {
    console.error('[Thumbnail] Error generating thumbnail:', error);
    // Try to mark as error in processing_states table using helper function
    try {
      await markProcessingError({
        mediaItemId: mediaId,
        progressType: 'thumbnail',
        errorMessage: 'Unhandled exception',
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

/**
 * Generate thumbnail using the default method (full processing)
 */
async function generateDefaultThumbnail(mediaItem: any): Promise<Buffer> {
  // Special handling for HEIC images using our multi-method approach
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
    return await sharp(jpegBuffer, { failOnError: false })
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();
  }

  // Special handling for TIFF files that might cause errors
  if (
    mediaItem.file_types?.extension === 'tiff' ||
    mediaItem.file_types?.extension === 'tif'
  ) {
    try {
      // First attempt: try with tiff-specific options
      return await sharp(mediaItem.file_path, {
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
          const result = await sharp(jpegBuffer, { failOnError: false })
            .rotate()
            .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
            .webp({ quality: 80 })
            .toBuffer();

          // Clean up temp file
          await fs.unlink(tempOutputPath).catch(console.error);

          return result;
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
  }

  // For all other image formats, use Sharp directly with enhanced error handling
  return await sharp(mediaItem.file_path, {
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

/**
 * Generate thumbnail by extracting embedded preview from EXIF data
 */
async function generateEmbeddedPreviewThumbnail(
  mediaItem: MediaItem,
): Promise<Buffer> {
  const exifData = mediaItem.exif_data as unknown as Tags;
  // First, check if we have EXIF data with embedded preview
  if (exifData) {
    try {
      // Convert base64 preview to buffer
      return Buffer.from(exifData.Thumbnail?.base64 || '', 'base64');
    } catch (previewError) {
      console.warn(
        `[Thumbnail] Failed to use embedded preview, falling back to default method: ${previewError}`,
      );
    }
  }

  // If no preview available or processing failed, try to extract thumbnail from EXIF
  try {
    const metadata = await sharp(mediaItem.file_path).metadata();
    if (metadata.hasProfile && metadata.hasProfile === true) {
      // Extract the thumbnail from EXIF if present
      const thumbnailBuffer = await sharp(mediaItem.file_path)
        .withMetadata()
        .toBuffer({ resolveWithObject: true })
        .then(({ data }) => {
          return sharp(data).extractChannel('alpha').toBuffer();
        })
        .catch(() => null);

      if (thumbnailBuffer) {
        return await sharp(thumbnailBuffer)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
      }
    }
  } catch (exifError) {
    console.warn(
      `[Thumbnail] Failed to extract EXIF thumbnail, falling back to default method: ${exifError}`,
    );
  }

  // Fallback to default method if embedded preview extraction failed
  console.log(
    `[Thumbnail] No embedded preview found for ${mediaItem.file_name}, using downscale-only method instead`,
  );
  return await generateDownscaleThumbnail(mediaItem);
}

/**
 * Generate thumbnail by simple downscaling without additional processing
 */
async function generateDownscaleThumbnail(mediaItem: any): Promise<Buffer> {
  return await sharp(mediaItem.file_path, {
    limitInputPixels: 30000 * 30000,
    failOnError: false,
  })
    // Skip auto-rotation to save processing time
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: 'cover',
      fastShrinkOnLoad: true,
      // Faster but lower quality algorithms
      kernel: 'nearest',
    })
    // Lower quality, faster processing
    .webp({ quality: 70, effort: 1 })
    .toBuffer();
}

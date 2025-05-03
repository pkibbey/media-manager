/** biome-ignore-all lint/style/noUnusedTemplateLiteral: <explanation> */
/** biome-ignore-all lint/style/noUselessElse: <explanation> */
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

  try {
    const supabase = createServerSupabaseClient();

    // Get the media item details
    const { data: mediaItem, error } = await supabase
      .from('media_items')
      .select('*, file_types!inner(*)') // Fixed: Removed exif_data(*) as it's not a related table
      .in('file_types.category', ['image'])
      .is('file_types.ignore', false)
      .eq('id', mediaId)
      .single();

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    // Check if file exists
    try {
      await fs.access(mediaItem.file_path);
    } catch (_error) {
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
      if (method === 'embedded-preview') {
        // Try to extract embedded preview from EXIF data
        thumbnailBuffer = await generateEmbeddedPreviewThumbnail(mediaItem);
      } else if (method === 'downscale-only') {
        // Simple downscaling without additional processing
        thumbnailBuffer = await generateDownscaleThumbnail(mediaItem);
      } else {
        // Default method - full processing
        thumbnailBuffer = await generateDefaultThumbnail(mediaItem);
      }
    } catch (thumbnailError) {
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

    try {
      const { error: storageError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, thumbnailBuffer, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (storageError) {
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
    } catch (uploadError) {
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
      // Attempt to delete the potentially orphaned thumbnail from storage
      await supabase.storage.from('thumbnails').remove([fileName]);

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

    // Update the processing state with success status using helper function
    try {
      await markProcessingSuccess({
        mediaItemId: mediaId,
        progressType: 'thumbnail',
        errorMessage: `Thumbnail generated successfully using ${method} method`,
      });
    } catch (updateProcessingStateError) {
      // Don't try to upsert again - that would cause another unique constraint violation
      // Instead, just log the error and return

      // Return success=true because the thumbnail IS available, despite the state tracking issue.
      return {
        success: true, // Thumbnail is generated and linked
        message: `Thumbnail generated, but failed to update processing state. ${updateProcessingStateError}`,
        thumbnailUrl,
        fileName: mediaItem.file_name,
      };
    }

    return {
      success: true,
      message: `Thumbnail generated and stored successfully using ${method} method`,
      thumbnailUrl,
      fileName: mediaItem.file_name,
    };
  } catch (error: any) {
    // Try to mark as error in processing_states table using helper function
    try {
      await markProcessingError({
        mediaItemId: mediaId,
        progressType: 'thumbnail',
        errorMessage: 'Unhandled exception',
      });
    } catch (_dbError) {
      // Silently continue if we couldn't mark the error
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

    try {
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
    } catch (heicError) {
      throw heicError;
    }
  }

  // Special handling for TIFF files that might cause errors
  if (
    mediaItem.file_types?.extension === 'tiff' ||
    mediaItem.file_types?.extension === 'tif'
  ) {
    try {
      // First attempt: try with tiff-specific options
      const result = await sharp(mediaItem.file_path, {
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

      return result;
    } catch (tiffError) {
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
          await fs.unlink(tempOutputPath).catch(() => {});

          return result;
        } catch (magickError) {
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
  try {
    const sharpInstance = sharp(mediaItem.file_path, {
      limitInputPixels: 30000 * 30000, // Allow reasonably large images
      failOnError: false, // Don't fail on corrupt images or unsupported features
    });

    const result = await sharpInstance
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        fastShrinkOnLoad: true, // Enable fast shrink optimization
      })
      .webp({ quality: 80, effort: 2 }) // Lower effort = faster processing
      .toBuffer();

    return result;
  } catch (sharpError) {
    throw sharpError;
  }
}

/**
 * Generate thumbnail by extracting embedded preview from EXIF data
 */
async function generateEmbeddedPreviewThumbnail(
  mediaItem: MediaItem,
): Promise<Buffer> {
  // EXIF data is a property of the media item itself, not a separate related table
  const exifData = mediaItem.exif_data as unknown as Tags;

  // First, check if we have EXIF data with embedded preview
  if (exifData) {
    try {
      // Convert base64 preview to buffer
      if (exifData.Thumbnail?.base64) {
        const buffer = Buffer.from(exifData.Thumbnail.base64, 'base64');
        return buffer;
      }
    } catch (_previewError) {
      // Continue to fallback
    }
  }

  // Fallback to default method if embedded preview extraction failed
  return await generateDownscaleThumbnail(mediaItem);
}

/**
 * Generate thumbnail by simple downscaling without additional processing
 */
async function generateDownscaleThumbnail(mediaItem: any): Promise<Buffer> {
  try {
    const result = await sharp(mediaItem.file_path, {
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

    return result;
  } catch (error) {
    throw new Error(
      `Downscale thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

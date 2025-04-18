'use server';

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  addAbortToken,
  isAborted as checkAbortToken,
} from '@/lib/abort-tokens';
import { createServerSupabaseClient } from '@/lib/supabase';
import { LARGE_FILE_THRESHOLD, isSkippedLargeFile } from '@/lib/utils';
import type {
  ThumbnailOptions,
  ThumbnailResult,
} from '@/types/thumbnail-types';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';

const execAsync = promisify(exec);

// Define thumbnail sizes
const THUMBNAIL_SIZE = 300; // Size for standard thumbnails

/**
 * Convert a HEIC image to JPEG using ImageMagick or native sips (macOS)
 */
async function convertHeicToJpeg(
  inputPath: string,
  tempOutputPath: string,
): Promise<Buffer> {
  try {
    // First try ImageMagick (requires it to be installed)
    try {
      await execAsync(`magick "${inputPath}" "${tempOutputPath}"`);
      return fs.readFile(tempOutputPath);
    } catch (magickError) {
      console.error('[Thumbnail] ImageMagick conversion failed:', magickError);

      // Try with sips if on macOS
      if (process.platform === 'darwin') {
        try {
          await execAsync(
            `sips -s format jpeg "${inputPath}" --out "${tempOutputPath}"`,
          );
          return fs.readFile(tempOutputPath);
        } catch (sipsError) {
          console.error('[Thumbnail] sips conversion failed:', sipsError);
          throw new Error('macOS sips command failed to convert HEIC image');
        }
      } else {
        throw new Error(
          'ImageMagick failed and sips is only available on macOS',
        );
      }
    }
  } catch (error) {
    console.error('[Thumbnail] All HEIC conversion methods failed:', error);
    throw new Error(
      `Failed to convert HEIC image: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure ImageMagick is installed correctly.`,
    );
  } finally {
    // Clean up temporary file if it exists
    try {
      await fs.access(tempOutputPath);
      await fs.unlink(tempOutputPath);
    } catch (error) {
      console.error(error);
    }
  }
}

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

        if (isSkippedLargeFile(mediaItem.file_path, stats.size)) {
          // Mark as processed but skip thumbnail generation
          await supabase
            .from('media_items')
            .update({ thumbnail_path: 'skipped:large_file' })
            .eq('id', mediaId);

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
      return {
        success: false,
        message: `Error generating thumbnail: ${sharpError instanceof Error ? sharpError.message : 'Processing error'}`,
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

    // Update the media item with the thumbnail path
    const { error: updateError } = await supabase
      .from('media_items')
      .update({ thumbnail_path: thumbnailUrl })
      .eq('id', mediaId);

    if (updateError) {
      console.error(
        `[Thumbnail] Error updating media item ${mediaId}:`,
        updateError,
      );
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
    // Try to extract the file path from the error message if possible
    let filePath = '';
    if (error.message && typeof error.message === 'string') {
      const filePathMatch = error.message.match(
        /[/\\][^/\\]+[/\\][^/\\]+\.[a-zA-Z0-9]+/,
      );
      if (filePathMatch) {
        filePath = filePathMatch[0];
      }
    }

    return {
      success: false,
      message: `Error generating thumbnail: ${error.message}`,
      filePath,
    };
  }
}

/**
 * Batch generate thumbnails for multiple media items
 */
export async function batchGenerateThumbnails(
  mediaIds: string[],
  options: ThumbnailOptions = {},
): Promise<ThumbnailResult> {
  try {
    const { batchSize = 50, skipLargeFiles = false } = options;

    // Limit the number of items to process at once to avoid timeout
    const itemsToProcess = mediaIds.slice(0, batchSize);

    let successCount = 0;
    let failedCount = 0;
    let skippedLargeFiles = 0;
    let currentFilePath = '';
    let fileType = '';
    // Store detailed error information
    const errors: Array<{ path: string; message: string }> = [];

    // CONCURRENCY CONTROL: Process items with limited concurrency
    const CONCURRENT_LIMIT = 8; // Increased from 3 to 8
    const DELAY_BETWEEN_UPLOADS = 50; // Add a small delay (in ms) between uploads

    // Function to delay execution
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Process items in smaller chunks with limited concurrency
    for (let i = 0; i < itemsToProcess.length; i += CONCURRENT_LIMIT) {
      const chunk = itemsToProcess.slice(i, i + CONCURRENT_LIMIT);
      const chunkResults = await Promise.all(
        chunk.map(async (id) => {
          const result = await generateThumbnail(id, { skipLargeFiles });
          // Add a small delay after each item to prevent overwhelming the storage API
          await delay(DELAY_BETWEEN_UPLOADS);
          return result;
        }),
      );

      // Process results from this chunk
      for (let i = 0; i < chunkResults.length; i++) {
        const result = chunkResults[i];
        const id = chunk[i];
        // Track current file for UI updates
        if (result.filePath) {
          currentFilePath = result.filePath;
        }
        if (result.fileType) {
          fileType = result.fileType;
        }

        if (result.success) {
          if (result.skipped && result.skippedReason === 'large_file') {
            skippedLargeFiles++;
          } else {
            successCount++;
          }
        } else {
          failedCount++;
          // Add detailed error information
          errors.push({
            path: result.filePath || id,
            message: result.message || 'Unknown error',
          });
        }
      }
    }

    return {
      success: true,
      message: `Generated ${successCount} thumbnails. Failed: ${failedCount}${skippedLargeFiles ? `. Skipped ${skippedLargeFiles} large files.` : ''}`,
      processed: successCount + failedCount + skippedLargeFiles,
      successCount: successCount,
      failedCount: failedCount,
      skippedLargeFiles,
      currentFilePath,
      fileType,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('Error in batch thumbnail generation:', error);
    return {
      success: false,
      message: `Error in batch processing: ${error.message}`,
      processed: 0,
      successCount: 0,
      failedCount: 0,
      skippedLargeFiles: 0,
      errors: [
        {
          path: 'batch-process',
          message: error.message || 'Unknown batch processing error',
        },
      ],
    };
  } finally {
    // Revalidate paths after processing
    revalidatePath('/browse');
    revalidatePath('/admin');
  }
}

/**
 * Generate thumbnails for all media items without thumbnails
 */
export async function generateMissingThumbnails(
  batchSize = 50,
  options: ThumbnailOptions = {},
): Promise<ThumbnailResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { skipLargeFiles = false } = options;

    // Get ignored file extensions first
    const { data: ignoredTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      ignoredTypes?.map((type) => type.extension.toLowerCase()) || [];

    // Define the image file extensions we want to process
    const imageExtensions = [
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

    // Build the query
    let query = supabase
      .from('media_items')
      .select('id, file_path, file_name, extension')
      .is('thumbnail_path', null) // Only include items with null thumbnail_path
      .in('extension', imageExtensions); // Only include image files

    // Exclude ignored file types if any are configured
    if (ignoredExtensions.length > 0) {
      query = query.not(
        'extension',
        'in',
        `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
      );
    }

    // Complete the query with ordering and limit
    const { data: mediaItems, error } = await query
      .order('id', { ascending: true })
      .limit(batchSize);

    if (error) {
      return {
        success: false,
        message: `Failed to fetch media items: ${error.message}`,
        processed: 0,
        skippedLargeFiles: 0,
        successCount: 0,
        failedCount: 0,
      };
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        message: 'No image files without thumbnails found',
        processed: 0,
        skippedLargeFiles: 0,
        successCount: 0,
        failedCount: 0,
      };
    }

    // Get the first file path to show in the UI immediately
    const initialFilePath = mediaItems[0]?.file_path || '';
    const fileExtension = initialFilePath.split('.').pop()?.toLowerCase() || '';

    const mediaIds = mediaItems.map((item) => item.id);
    const result = await batchGenerateThumbnails(mediaIds, {
      batchSize,
      skipLargeFiles,
    });

    // If no current file path was set during processing, use the initial one
    if (!result.currentFilePath && initialFilePath) {
      result.currentFilePath = initialFilePath;
    }

    // If no file type was set, use the extension from the initial file
    if (!result.fileType && fileExtension) {
      result.fileType = fileExtension;
    }

    return result;
  } catch (error: any) {
    console.error('Error generating missing thumbnails:', error);
    return {
      success: false,
      message: `Error generating missing thumbnails: ${error.message}`,
      processed: 0,
      skippedLargeFiles: 0,
      successCount: 0,
      failedCount: 0,
      errors: [
        {
          path: 'missing-thumbnails',
          message:
            error.message || 'Unknown error in generateMissingThumbnails',
        },
      ],
    };
  }
}

/**
 * Reset all thumbnails by deleting them from storage and clearing thumbnail_path
 */
export async function resetAllThumbnails(): Promise<ThumbnailResult> {
  try {
    const supabase = createServerSupabaseClient();

    // 1. Count media items with thumbnails for the result message
    const { count, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .not('thumbnail_path', 'is', null);

    if (countError) {
      console.error('Error counting thumbnails:', countError);
      return {
        success: false,
        message: `Failed to count thumbnails: ${countError.message}`,
      };
    }

    // 2. Delete all files from the thumbnails bucket
    const { data: listData, error: listError } = await supabase.storage
      .from('thumbnails')
      .list('thumbnails');

    if (listError) {
      console.error('Error listing thumbnails in storage:', listError);
      return {
        success: false,
        message: `Error listing thumbnails: ${listError.message}`,
      };
    }

    if (listData && listData.length > 0) {
      // Delete files in batches to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < listData.length; i += batchSize) {
        const batch = listData.slice(i, i + batchSize);
        const filesToDelete = batch.map((item) => `thumbnails/${item.name}`);

        const { error: deleteError } = await supabase.storage
          .from('thumbnails')
          .remove(filesToDelete);

        if (deleteError) {
          console.error('Error deleting thumbnails batch:', deleteError);
          // Continue with next batch
        }
      }
    }

    // 3. Reset thumbnail_path for all media items
    const { error: updateError } = await supabase
      .from('media_items')
      .update({ thumbnail_path: null })
      .not('thumbnail_path', 'is', null);

    if (updateError) {
      console.error('Error resetting media items:', updateError);
      return {
        success: false,
        message: `Error resetting media items: ${updateError.message}`,
      };
    }

    return {
      success: true,
      message: `Successfully reset ${count || 0} thumbnails`,
      processed: count || 0,
    };
  } catch (error: any) {
    console.error('Error resetting thumbnails:', error);
    return {
      success: false,
      message: `Error resetting thumbnails: ${error.message}`,
    };
  } finally {
    // Revalidate paths after all operations
    revalidatePath('/browse');
    revalidatePath('/admin');
  }
}

/**
 * Get thumbnail generation statistics
 * This provides counts of thumbnails generated, skipped, and pending
 */
export async function getThumbnailStats() {
  try {
    const supabase = createServerSupabaseClient();

    // Get ignored file types first for consistent filtering
    const { data: fileTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      fileTypes?.map((ft) => ft.extension.toLowerCase()) || [];

    // Define the image file extensions we support for thumbnails
    const imageExtensions = [
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

    // Prepare the filter expression if we have ignored extensions
    const ignoredFilter =
      ignoredExtensions.length > 0
        ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
        : null;

    // 1. Count all thumbnail-compatible files (excluding ignored types)
    let compatibleQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .in('extension', imageExtensions);

    if (ignoredFilter) {
      compatibleQuery = compatibleQuery.filter(
        'extension',
        'not.in',
        ignoredFilter,
      );
    }

    const { count: compatibleCount, error: compatibleError } =
      await compatibleQuery;

    if (compatibleError) {
      console.error('Error counting compatible files:', compatibleError);
      return {
        success: false,
        error: compatibleError.message,
      };
    }

    // 2. Count files with thumbnails successfully generated
    let withThumbnailsQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .in('extension', imageExtensions)
      .not('thumbnail_path', 'is', null)
      .not('thumbnail_path', 'like', 'skipped:%'); // Exclude skipped files

    if (ignoredFilter) {
      withThumbnailsQuery = withThumbnailsQuery.filter(
        'extension',
        'not.in',
        ignoredFilter,
      );
    }

    const { count: withThumbnailsCount, error: withThumbnailsError } =
      await withThumbnailsQuery;

    if (withThumbnailsError) {
      console.error(
        'Error counting files with thumbnails:',
        withThumbnailsError,
      );
      return {
        success: false,
        error: withThumbnailsError.message,
      };
    }

    // 3. Count files that were skipped (e.g., large files)
    let skippedQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .in('extension', imageExtensions)
      .like('thumbnail_path', 'skipped:%');

    if (ignoredFilter) {
      skippedQuery = skippedQuery.filter('extension', 'not.in', ignoredFilter);
    }

    const { count: skippedCount, error: skippedError } = await skippedQuery;

    if (skippedError) {
      console.error('Error counting skipped files:', skippedError);
      return {
        success: false,
        error: skippedError.message,
      };
    }

    // 4. Count files pending thumbnail generation
    let pendingQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .in('extension', imageExtensions)
      .is('thumbnail_path', null);

    if (ignoredFilter) {
      pendingQuery = pendingQuery.filter('extension', 'not.in', ignoredFilter);
    }

    const { count: pendingCount, error: pendingError } = await pendingQuery;

    if (pendingError) {
      console.error('Error counting pending files:', pendingError);
      return {
        success: false,
        error: pendingError.message,
      };
    }

    // 5. Break down skipped files by reason (e.g., large files)
    let largeFilesQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .in('extension', imageExtensions)
      .eq('thumbnail_path', 'skipped:large_file');

    if (ignoredFilter) {
      largeFilesQuery = largeFilesQuery.filter(
        'extension',
        'not.in',
        ignoredFilter,
      );
    }

    const { count: largeFilesCount, error: largeFilesError } =
      await largeFilesQuery;

    if (largeFilesError) {
      console.error('Error counting large files:', largeFilesError);
      return {
        success: false,
        error: largeFilesError.message,
      };
    }

    return {
      success: true,
      stats: {
        totalCompatibleFiles: compatibleCount || 0,
        filesWithThumbnails: withThumbnailsCount || 0,
        filesSkipped: skippedCount || 0,
        filesPending: pendingCount || 0,
        skippedLargeFiles: largeFilesCount || 0,
        // Add more specific stats as needed
      },
    };
  } catch (error: any) {
    console.error('Error getting thumbnail stats:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Regenerate thumbnails for items that should have thumbnails but don't
 * This looks for items with a null thumbnail_path field
 */
export async function regenerateMissingThumbnails(): Promise<ThumbnailResult> {
  try {
    const supabase = createServerSupabaseClient();

    // Get image extensions
    const imageExtensions = [
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

    // Get ignored file types
    const { data: ignoredTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      ignoredTypes?.map((type) => type.extension.toLowerCase()) || [];

    // Find items that should have thumbnails but don't
    let query = supabase
      .from('media_items')
      .select('id')
      .in('extension', imageExtensions)
      .is('thumbnail_path', null);

    // Exclude ignored file types
    if (ignoredExtensions.length > 0) {
      query = query.not(
        'extension',
        'in',
        `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
      );
    }

    const { data: mediaItems, error } = await query;

    if (error) {
      console.error(
        '[Thumbnail] Error finding items missing thumbnails:',
        error,
      );
      return {
        success: false,
        message: `Error finding items missing thumbnails: ${error.message}`,
        processed: 0,
      };
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        message: 'No media items missing thumbnails found',
        processed: 0,
      };
    }

    const mediaIds = mediaItems.map((item) => item.id);

    // Process these items with the existing batch function
    const result = await batchGenerateThumbnails(mediaIds, {
      batchSize: 50,
      skipLargeFiles: true,
    });

    return {
      ...result,
      message: `Regenerated ${result.successCount || 0} thumbnails for items that were missing them`,
    };
  } catch (error: any) {
    console.error('[Thumbnail] Error regenerating missing thumbnails:', error);
    return {
      success: false,
      message: `Error regenerating missing thumbnails: ${error.message}`,
      processed: 0,
    };
  }
}

/**
 * Count media items that need thumbnails (no thumbnail_path)
 * Uses the same filtering logic as generateMissingThumbnails
 */
export async function countMissingThumbnails(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get ignored file extensions
    const { data: ignoredTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      ignoredTypes?.map((type) => type.extension.toLowerCase()) || [];

    // Define the image file extensions we want to process
    const imageExtensions = [
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

    // Build the query
    let query = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .is('thumbnail_path', null) // Only include items with null thumbnail_path
      .in('extension', imageExtensions); // Only include image files

    // Exclude ignored file types if any are configured
    if (ignoredExtensions.length > 0) {
      query = query.not(
        'extension',
        'in',
        `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
      );
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting missing thumbnails:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    console.error('Error counting missing thumbnails:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Stream process thumbnails for all media items without thumbnails
 * This is a streaming version that provides real-time progress updates
 */
export async function streamProcessMissingThumbnails(
  options: ThumbnailOptions = {},
) {
  const encoder = new TextEncoder();
  const { skipLargeFiles = false, abortToken } = options;

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background
  processInBackground({ writer, skipLargeFiles, abortToken });

  // Return the readable stream
  return stream.readable;

  async function processInBackground({
    writer,
    skipLargeFiles,
    abortToken,
  }: {
    writer: WritableStreamDefaultWriter;
    skipLargeFiles: boolean;
    abortToken?: string;
  }) {
    try {
      const supabase = createServerSupabaseClient();

      // Send initial progress update
      await sendProgress(writer, {
        status: 'started',
        message: `Starting thumbnail generation${skipLargeFiles ? ' (skipping large files)' : ''}`,
      });

      // Get ignored file extensions first
      const { data: ignoredTypes } = await supabase
        .from('file_types')
        .select('extension')
        .eq('ignore', true);

      const ignoredExtensions =
        ignoredTypes?.map((type) => type.extension.toLowerCase()) || [];

      // Define the image file extensions we want to process
      const imageExtensions = [
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

      // Build the query to count all pending items
      let countQuery = supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .is('thumbnail_path', null)
        .in('extension', imageExtensions);

      // Exclude ignored file types
      if (ignoredExtensions.length > 0) {
        countQuery = countQuery.not(
          'extension',
          'in',
          `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
        );
      }

      // Get the total count of items to process
      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        await sendProgress(writer, {
          status: 'error',
          message: `Failed to count media items: ${countError.message}`,
          error: countError.message,
        });
        await writer.close();
        return;
      }

      if (!totalCount || totalCount === 0) {
        await sendProgress(writer, {
          status: 'completed',
          message: 'No image files without thumbnails found',
          totalItems: 0,
          processed: 0,
          successCount: 0,
          failedCount: 0,
          skippedLargeFiles: 0,
        });
        await writer.close();
        return;
      }

      // Send total count to the UI
      await sendProgress(writer, {
        status: 'processing',
        message: `Found ${totalCount} files to process`,
        totalItems: totalCount,
        processed: 0,
        successCount: 0,
        failedCount: 0,
        skippedLargeFiles: 0,
      });

      // Process in smaller batches to avoid timeouts
      const batchSize = 25;
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let skippedLargeFiles = 0;

      // Function to delay execution
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // Function to check if operation has been aborted
      const checkAborted = async (): Promise<boolean> => {
        if (!abortToken) return false;
        return await checkAbortToken(abortToken);
      };

      // Process until all items are done
      while (processedCount < totalCount) {
        // Check if operation was aborted
        if (await checkAborted()) {
          await sendProgress(writer, {
            status: 'aborted',
            message: 'Thumbnail generation was cancelled',
            totalItems: totalCount,
            processed: processedCount,
            successCount,
            failedCount,
            skippedLargeFiles,
          });
          await writer.close();
          return;
        }

        // Build the query to get the next batch
        let query = supabase
          .from('media_items')
          .select('id, file_path, file_name, extension')
          .is('thumbnail_path', null)
          .in('extension', imageExtensions);

        // Exclude ignored file types
        if (ignoredExtensions.length > 0) {
          query = query.not(
            'extension',
            'in',
            `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
          );
        }

        // Get the next batch of items to process
        const { data: mediaItems, error: fetchError } = await query
          .order('id', { ascending: true })
          .limit(batchSize);

        if (fetchError) {
          await sendProgress(writer, {
            status: 'error',
            message: `Failed to fetch media items: ${fetchError.message}`,
            error: fetchError.message,
            totalItems: totalCount,
            processed: processedCount,
            successCount,
            failedCount,
            skippedLargeFiles,
          });
          await writer.close();
          return;
        }

        if (!mediaItems || mediaItems.length === 0) {
          // No more items to process
          break;
        }

        // Process each item one at a time to provide better progress updates
        for (const item of mediaItems) {
          // Check if operation was aborted before processing each item
          if (await checkAborted()) {
            await sendProgress(writer, {
              status: 'aborted',
              message: 'Thumbnail generation was cancelled',
              totalItems: totalCount,
              processed: processedCount,
              successCount,
              failedCount,
              skippedLargeFiles,
            });
            await writer.close();
            return;
          }

          // Send progress update before processing each file
          await sendProgress(writer, {
            status: 'processing',
            message: `Processing ${processedCount + 1} of ${totalCount}`,
            totalItems: totalCount,
            processed: processedCount,
            successCount,
            failedCount,
            skippedLargeFiles,
            currentFilePath: item.file_path,
            currentFileName: item.file_name,
            fileType: item.extension,
          });

          // Process the item
          const result = await generateThumbnail(item.id, { skipLargeFiles });

          // Update counters based on result
          processedCount++;

          if (result.success) {
            if (result.skipped && result.skippedReason === 'large_file') {
              skippedLargeFiles++;
            } else {
              successCount++;
            }
          } else {
            failedCount++;
          }

          // Send progress update after processing each file
          await sendProgress(writer, {
            status: 'processing',
            // message: `Processed ${processedCount} of ${totalCount}`,
            totalItems: totalCount,
            processed: processedCount,
            successCount,
            failedCount,
            skippedLargeFiles,
            currentFilePath: item.file_path,
            currentFileName: item.file_name,
            fileType: item.extension,
          });

          // Add a small delay to prevent overwhelming the browser with updates
          await delay(100);
        }
      }

      // Send final progress update
      await sendProgress(writer, {
        status: 'completed',
        message: `Completed processing ${processedCount} files: ${successCount} thumbnails generated, ${failedCount} failed, ${skippedLargeFiles} large files skipped`,
        totalItems: totalCount,
        processed: processedCount,
        successCount,
        failedCount,
        skippedLargeFiles,
      });

      // Close the stream
      await writer.close();
    } catch (error: any) {
      console.error('Error during thumbnail processing:', error);
      await sendProgress(writer, {
        status: 'error',
        message: `Error during thumbnail processing: ${error.message}`,
        error: error.message,
      });
      await writer.close();
    } finally {
      // Revalidate paths after all operations
      revalidatePath('/browse');
      revalidatePath('/admin');
    }
  }

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: any,
  ) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
  }
}

/**
 * Abort thumbnail generation process
 */
export async function abortThumbnailGeneration(token: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Add the token to the abort set
    await addAbortToken(token);
    return {
      success: true,
      message: 'Thumbnail generation aborted successfully',
    };
  } catch (error: any) {
    console.error('Error aborting thumbnail generation:', error);
    return {
      success: false,
      message: `Error aborting thumbnail generation: ${error.message || 'Unknown error'}`,
    };
  }
}

// Migration script to fix existing thumbnail paths
export async function fixThumbnailPaths(): Promise<{ fixed: number }> {
  const supabase = createServerSupabaseClient();

  // Find records with duplicate thumbnails/ prefix
  const { data, error } = await supabase
    .from('media_items')
    .select('id, thumbnail_path')
    .like('thumbnail_path', '%/thumbnails/thumbnails/%');

  if (error || !data) {
    console.error('Error finding records with duplicate paths:', error);
    return { fixed: 0 };
  }

  let fixedCount = 0;
  for (const item of data) {
    const fixedPath = item.thumbnail_path?.replace(
      '/thumbnails/thumbnails/',
      '/thumbnails/',
    );
    const { error: updateError } = await supabase
      .from('media_items')
      .update({ thumbnail_path: fixedPath })
      .eq('id', item.id);

    if (!updateError) fixedCount++;
  }

  return { fixed: fixedCount };
}

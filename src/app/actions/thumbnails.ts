'use server';

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { addAbortToken, isAborted, removeAbortToken } from '@/lib/abort-tokens';
import { LARGE_FILE_THRESHOLD } from '@/lib/consts';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isSkippedLargeFile } from '@/lib/utils';
import type {
  ThumbnailOptions,
  ThumbnailResult,
} from '@/types/thumbnail-types';
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

/**
 * Count the number of media items missing thumbnails
 */
export async function countMissingThumbnails(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get supported image formats
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

    // Get the count of items that need thumbnails - compatible items without successful/skipped processing
    const { count, error } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .in('extension', supportedImageFormats)
      .not(
        'id',
        'in',
        supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'thumbnail')
          .in('status', ['success', 'skipped']),
      );

    if (error) {
      throw new Error(`Failed to count missing thumbnails: ${error.message}`);
    }

    return {
      success: true,
      count: count || 0,
    };
  } catch (error: any) {
    console.error('Error counting missing thumbnails:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get statistics about thumbnail status
 */
export async function getThumbnailStats(): Promise<{
  success: boolean;
  stats?: {
    totalCompatibleFiles: number;
    filesWithThumbnails: number;
    filesSkipped: number;
    filesPending: number;
    skippedLargeFiles: number;
  };
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Define supported formats for thumbnails
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

    // Get total count of compatible files
    const { count: totalCount, error: totalError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .in('extension', supportedImageFormats);

    if (totalError) {
      throw new Error(
        `Failed to get total compatible files: ${totalError.message}`,
      );
    }

    // Get count of files with successful thumbnails
    const { count: withThumbnailsCount, error: withThumbnailsError } =
      await supabase
        .from('processing_states')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'thumbnail')
        .eq('status', 'success');

    if (withThumbnailsError) {
      throw new Error(
        `Failed to get files with thumbnails: ${withThumbnailsError.message}`,
      );
    }

    // Get count of files skipped due to being large
    const { count: skippedLargeFilesCount, error: skippedLargeFilesError } =
      await supabase
        .from('processing_states')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'thumbnail')
        .eq('status', 'skipped');

    if (skippedLargeFilesError) {
      throw new Error(
        `Failed to get skipped large files count: ${skippedLargeFilesError.message}`,
      );
    }

    // Get count of files with unsupported formats
    const { count: filesSkippedCount, error: filesSkippedError } =
      await supabase
        .from('processing_states')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'thumbnail')
        .eq('status', 'unsupported');

    if (filesSkippedError) {
      throw new Error(
        `Failed to get skipped files count: ${filesSkippedError.message}`,
      );
    }

    // Calculate pending files by subtracting thumbnail-having files from total
    const filesPending =
      (totalCount || 0) -
      (withThumbnailsCount || 0) -
      (filesSkippedCount || 0) -
      (skippedLargeFilesCount || 0);

    return {
      success: true,
      stats: {
        totalCompatibleFiles: totalCount || 0,
        filesWithThumbnails: withThumbnailsCount || 0,
        filesSkipped: filesSkippedCount || 0,
        filesPending: filesPending > 0 ? filesPending : 0,
        skippedLargeFiles: skippedLargeFilesCount || 0,
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
 * Reset all thumbnails by clearing paths and removing files from storage
 */
export async function resetAllThumbnails(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Delete all thumbnail processing states
    const { error: deleteError, count } = await supabase
      .from('processing_states')
      .delete({ count: 'exact' })
      .eq('type', 'thumbnail');

    if (deleteError) {
      throw new Error(
        `Failed to reset thumbnail states: ${deleteError.message}`,
      );
    }

    return {
      success: true,
      message: `Successfully reset thumbnails for ${count || 0} files`,
    };
  } catch (error: any) {
    console.error('Error resetting thumbnails:', error);
    return {
      success: false,
      message: `Failed to reset thumbnails: ${error.message}`,
    };
  }
}

/**
 * Stream process missing thumbnails with progress updates
 */
export async function streamProcessMissingThumbnails(
  options: ThumbnailOptions = {},
) {
  const encoder = new TextEncoder();

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background
  processAllMissingThumbnails(writer, options);

  // Return the readable stream
  return stream.readable;

  async function processAllMissingThumbnails(
    writer: WritableStreamDefaultWriter,
    options: ThumbnailOptions,
  ) {
    try {
      const supabase = createServerSupabaseClient();
      const { skipLargeFiles = true, abortToken } = options;

      // Define supported image formats
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

      // Add abort token to active tokens
      if (abortToken) {
        await addAbortToken(abortToken);
      }

      // Send initial progress
      await sendProgress(writer, {
        status: 'started',
        message: 'Starting thumbnail generation',
      });

      // Query to get items that need thumbnails using processing_states table
      const { data: items, error } = await supabase
        .from('media_items')
        .select('id, file_path, file_name, extension, size_bytes')
        .in('extension', supportedImageFormats)
        .not(
          'id',
          'in',
          supabase
            .from('processing_states')
            .select('media_item_id')
            .eq('type', 'thumbnail')
            .in('status', ['success', 'skipped']),
        )
        .order('id');

      if (error) {
        await sendProgress(writer, {
          status: 'error',
          message: `Error fetching media items: ${error.message}`,
          error: error.message,
        });
        await writer.close();
        return;
      }

      if (!items || items.length === 0) {
        await sendProgress(writer, {
          status: 'completed',
          message: 'No items need thumbnail processing',
          totalItems: 0,
          processed: 0,
        });
        await writer.close();
        return;
      }

      await sendProgress(writer, {
        status: 'generating',
        message: `Found ${items.length} items that need thumbnails`,
        totalItems: items.length,
        processed: 0,
      });

      // Process items in batches
      let processed = 0;
      let successCount = 0;
      let failedCount = 0;
      let skippedLargeFiles = 0;

      for (const item of items) {
        try {
          // Check for abort request
          if (abortToken && (await isAborted(abortToken))) {
            await sendProgress(writer, {
              status: 'error',
              message: 'Thumbnail generation aborted by user',
              totalItems: items.length,
              processed,
              successCount,
              failedCount,
              skippedLargeFiles,
            });
            await writer.close();
            return;
          }

          await sendProgress(writer, {
            status: 'generating',
            message: `Generating thumbnail for file ${processed + 1} of ${items.length}`,
            currentFilePath: item.file_path,
            currentFileName: item.file_name,
            fileType: item.extension,
            totalItems: items.length,
            processed,
            successCount,
            failedCount,
            skippedLargeFiles,
          });

          // Generate thumbnail
          const result = await generateThumbnail(item.id, { skipLargeFiles });

          if (result.skipped) {
            skippedLargeFiles++;
          } else if (result.success) {
            successCount++;
          } else {
            failedCount++;
          }

          processed++;

          // Send progress update
          await sendProgress(writer, {
            status: 'generating',
            message: `${processed} of ${items.length} processed (${successCount} success, ${failedCount} failed, ${skippedLargeFiles} skipped)`,
            totalItems: items.length,
            processed,
            successCount,
            failedCount,
            skippedLargeFiles,
            currentFilePath: result.filePath,
            currentFileName: result.fileName,
            fileType: result.fileType,
          });
        } catch (itemError: any) {
          failedCount++;
          processed++;

          console.error(`Error processing item ${item.id}:`, itemError);
          await sendProgress(writer, {
            status: 'error',
            message: `Error processing item: ${itemError.message}`,
            error: itemError.message,
            currentFilePath: item.file_path,
            currentFileName: item.file_name,
            fileType: item.extension,
            totalItems: items.length,
            processed,
            successCount,
            failedCount,
            skippedLargeFiles,
          });
        }
      }

      // Remove abort token now that processing is complete
      if (abortToken) {
        await removeAbortToken(abortToken);
      }

      // Send final progress
      await sendProgress(writer, {
        status: 'completed',
        message: `Thumbnail generation completed: ${processed} processed, ${successCount} successful, ${failedCount} failed, ${skippedLargeFiles} skipped`,
        totalItems: items.length,
        processed,
        successCount,
        failedCount,
        skippedLargeFiles,
      });

      await writer.close();
    } catch (error: any) {
      console.error('Error processing thumbnails:', error);
      await sendProgress(writer, {
        status: 'error',
        message: `Error processing thumbnails: ${error.message}`,
        error: error.message,
      });
      await writer.close();
    }
  }

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: Record<string, any>,
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
    // Check if the token exists
    const isActive = await isAborted(token);

    if (isActive) {
      return {
        success: true,
        message: 'Cancellation already in progress',
      };
    }

    // Add the token to the abort list
    await addAbortToken(token);

    return {
      success: true,
      message: 'Thumbnail generation cancelled',
    };
  } catch (error: any) {
    console.error('Error aborting thumbnail generation:', error);
    return {
      success: false,
      message: `Failed to abort: ${error.message}`,
    };
  }
}

/**
 * Regenerate missing thumbnails (non-streaming batch version)
 */
export async function regenerateMissingThumbnails(): Promise<{
  success: boolean;
  message: string;
  count?: number;
}> {
  try {
    const supabase = createServerSupabaseClient();
    let processed = 0;
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Define supported image formats
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

    // Get items that need thumbnails using processing_states table
    const { data: items, error } = await supabase
      .from('media_items')
      .select('id')
      .in('extension', supportedImageFormats)
      .not(
        'id',
        'in',
        supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'thumbnail')
          .in('status', ['success', 'skipped']),
      )
      .or(
        `id.in.(${supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'thumbnail')
          .eq('status', 'error')})`,
      )
      .limit(100); // Limit to a reasonable batch size

    if (error) {
      throw new Error(`Error fetching media items: ${error.message}`);
    }

    if (!items || items.length === 0) {
      return {
        success: true,
        message: 'No missing thumbnails to regenerate',
        count: 0,
      };
    }

    // Process each item
    for (const item of items) {
      try {
        const result = await generateThumbnail(item.id, {
          skipLargeFiles: true,
        });

        processed++;

        if (result.skipped) {
          skippedCount++;
        } else if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (itemError) {
        failedCount++;
        processed++;
        console.error(
          `Error regenerating thumbnail for ${item.id}:`,
          itemError,
        );
      }
    }

    return {
      success: true,
      message: `Regenerated ${successCount} thumbnails (${failedCount} failed, ${skippedCount} skipped)`,
      count: processed,
    };
  } catch (error: any) {
    console.error('Error regenerating thumbnails:', error);
    return {
      success: false,
      message: `Failed to regenerate thumbnails: ${error.message}`,
    };
  }
}

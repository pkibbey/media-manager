'use server';
import fs from 'node:fs/promises';
import { extractMetadata } from '@/lib/exif-utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { extractDateFromFilename } from '@/lib/utils';
import type { Json } from '@/types/supabase';
import { revalidatePath } from 'next/cache';

// Types for EXIF processing progress reporting
export type ExifProgress = {
  status: 'started' | 'processing' | 'completed' | 'error';
  message: string;
  filesDiscovered?: number;
  filesProcessed?: number;
  successCount?: number;
  failedCount?: number;
  error?: string;
  currentFilePath?: string;
};

/**
 * Helper function to convert GPS coordinates from DMS format to decimal degrees
 */
function calculateGpsDecimal(
  coordinates: number[] | undefined,
  ref: string | undefined,
): number | undefined {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return undefined;
  }

  // Calculate decimal degrees from degrees, minutes, seconds
  let decimal = coordinates[0] + coordinates[1] / 60 + coordinates[2] / 3600;

  // Apply negative value for South or West references
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

export async function processMediaExif(mediaId: string, filePath: string) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    // Check if file exists
    await fs.access(filePath);

    // Extract EXIF data from the file
    const exifData = await extractMetadata(filePath);

    if (!exifData) {
      return { success: false, message: 'No EXIF data could be extracted' };
    }

    // Update the media record in the database
    const { error } = await supabase
      .from('media_items')
      .update({
        exif_data: exifData as Json,
        has_exif: true,
        // Use correct date property from Photo section
        media_date:
          exifData.Photo?.DateTimeOriginal?.toISOString() ||
          exifData.Image?.DateTime?.toISOString(),
        // Get dimensions from the Image section
        width: exifData.Photo?.PixelXDimension,
        height: exifData.Photo?.PixelYDimension,
      })
      .eq('id', mediaId);

    if (error) {
      console.error('Error updating media with EXIF data:', error);
      return { success: false, message: error.message };
    }

    // Revalidate relevant paths to update the UI
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath(`/media/${mediaId}`);

    return {
      success: true,
      message: 'EXIF data extracted and stored successfully',
      exifData,
    };
  } catch (error) {
    console.error('Error processing EXIF data:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function batchProcessExif(folderPath: string) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    // Get all media files that don't have EXIF data yet
    const { data: mediaFiles, error } = await supabase
      .from('media_items')
      .select('id, file_path')
      .eq('has_exif', false)
      .eq('folder_path', folderPath);

    if (error) {
      return { success: false, message: error.message, processed: 0, total: 0 };
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return {
        success: true,
        message: 'No files to process',
        processed: 0,
        total: 0,
      };
    }

    // Process each media file
    let successCount = 0;
    const total = mediaFiles.length;

    for (const media of mediaFiles) {
      const result = await processMediaExif(media.id, media.file_path);
      if (result.success) {
        successCount++;
      }
    }

    // Revalidate paths
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Processed ${successCount} of ${total} files`,
      processed: successCount,
      total,
    };
  } catch (error) {
    console.error('Error in batch processing EXIF data:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
      processed: 0,
      total: 0,
    };
  }
}

export async function getExifStats() {
  try {
    const supabase = createServerSupabaseClient();

    // Get count of media with EXIF data
    const { count: withExif, error: withExifError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('has_exif', true);

    // Get count of media that was processed but couldn't extract EXIF data
    const { count: processedNoExif, error: processedNoExifError } =
      await supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .eq('processed', true)
        .eq('has_exif', false);

    // Get count of media that hasn't been processed yet
    const { count: unprocessed, error: unprocessedError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false);

    // Get total count of media items
    const { count: total, error: totalError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });

    // Check for errors
    if (
      withExifError ||
      processedNoExifError ||
      unprocessedError ||
      totalError
    ) {
      const error =
        withExifError || processedNoExifError || unprocessedError || totalError;
      return { success: false, message: error?.message };
    }

    return {
      success: true,
      stats: {
        with_exif: withExif || 0,
        processed_no_exif: processedNoExif || 0,
        total_processed: (withExif || 0) + (processedNoExif || 0),
        unprocessed: unprocessed || 0,
        total: total || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching EXIF stats:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function processAllUnprocessedItems(count: number) {
  try {
    const supabase = createServerSupabaseClient();

    // Get all media files that don't have EXIF data yet and are not ignored file types
    const { data: fileTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      fileTypes?.map((ft) => ft.extension.toLowerCase()) || [];

    const { data: mediaFiles, error } = await supabase
      .from('media_items')
      .select('id, file_path, extension')
      .eq('has_exif', false)
      .eq('processed', false)
      .filter(
        'extension',
        'not.in',
        `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
      )
      .limit(count); // Process in batches to avoid timeouts

    if (error) {
      return {
        success: false,
        message: error.message,
        processed: 0,
        total: 0,
      };
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return {
        success: true,
        message: 'No files to process',
        processed: 0,
        total: 0,
      };
    }

    // Process each media file
    let successCount = 0;
    const total = mediaFiles.length;

    for (const media of mediaFiles) {
      try {
        const result = await processMediaExif(media.id, media.file_path);

        // Even if EXIF processing fails, mark the file as processed
        await supabase
          .from('media_items')
          .update({
            processed: true,
            has_exif: result.success,
          })
          .eq('id', media.id);

        if (result.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${media.file_path}:`, error);
        // Mark as processed even on error to avoid reprocessing problematic files
        await supabase
          .from('media_items')
          .update({ processed: true })
          .eq('id', media.id);
      }
    }

    // Revalidate paths
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Processed ${successCount} of ${total} files`,
      processed: successCount,
      total,
    };
  } catch (error) {
    console.error('Error processing unprocessed items:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
      processed: 0,
      total: 0,
    };
  }
}

/**
 * Update media dates based on filename analysis
 * This helps when EXIF data is missing or corrupt but the filename contains date information
 */
export async function updateMediaDatesFromFilenames(
  itemCount = 100,
  updateAll = false,
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  processed: number;
  updated: number;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get items with missing media_date or all items if updateAll is true
    let query = supabase
      .from('media_items')
      .select('id, file_name, media_date');

    if (!updateAll) {
      query = query.is('media_date', null);
    }

    const { data: mediaItems, error } = await query.limit(itemCount);

    if (error) {
      return {
        success: false,
        error: error.message,
        processed: 0,
        updated: 0,
      };
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        message: 'No files to process',
        processed: 0,
        updated: 0,
      };
    }

    // Process each item
    let updatedCount = 0;

    for (const item of mediaItems) {
      // Try to extract date from filename
      const extractedDate = extractDateFromFilename(item.file_name);

      if (extractedDate) {
        // Update the media date in database
        const { error: updateError } = await supabase
          .from('media_items')
          .update({
            media_date: extractedDate.toISOString(),
            // If we're updating from filename, we can also mark it as processed
            processed: true,
          })
          .eq('id', item.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error(
            `Error updating date for ${item.file_name}:`,
            updateError,
          );
        }
      }
    }

    // Revalidate paths to update UI
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Updated dates for ${updatedCount} of ${mediaItems.length} files`,
      processed: mediaItems.length,
      updated: updatedCount,
    };
  } catch (error: any) {
    console.error('Error updating media dates from filenames:', error);
    return {
      success: false,
      error: error.message,
      processed: 0,
      updated: 0,
    };
  }
}

/**
 * Process EXIF data for a single media item by ID
 * This function is used by the batch processing implementation
 */
export async function processExifData(mediaId: string) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    // First get the media item to access its file path
    const { data: mediaItem, error: fetchError } = await supabase
      .from('media_items')
      .select('file_path')
      .eq('id', mediaId)
      .single();

    if (fetchError || !mediaItem) {
      console.error('Error fetching media item:', fetchError);
      return {
        success: false,
        message: fetchError?.message || 'Media item not found',
      };
    }

    const filePath = mediaItem.file_path;

    // Check if file exists
    await fs.access(filePath);

    // Extract EXIF data from the file
    const exifData = await extractMetadata(filePath);

    // Even if we don't get EXIF data, mark the file as processed
    if (!exifData) {
      // Update the media record to mark as processed but without EXIF
      await supabase
        .from('media_items')
        .update({
          processed: true,
          has_exif: false,
        })
        .eq('id', mediaId);

      return {
        success: false,
        message:
          'No EXIF data could be extracted, but item marked as processed',
      };
    }

    // Update the media record in the database
    const { error } = await supabase
      .from('media_items')
      .update({
        exif_data: exifData as Json,
        has_exif: true,
        processed: true,
        // Use correct date property from Photo section
        media_date:
          exifData.Photo?.DateTimeOriginal?.toISOString() ||
          exifData.Image?.DateTime?.toISOString(),
      })
      .eq('id', mediaId);

    if (error) {
      console.error('Error updating media with EXIF data:', error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: 'EXIF data extracted and stored successfully',
      exifData,
    };
  } catch (error) {
    console.error('Error processing EXIF data:', error);

    // Even on error, mark the item as processed to avoid retrying problematic files
    try {
      const supabase = createServerSupabaseClient();
      await supabase
        .from('media_items')
        .update({ processed: true })
        .eq('id', mediaId);
    } catch (updateError) {
      console.error('Error updating processed state:', updateError);
    }

    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Process all unprocessed items with streaming updates
 * This function returns a ReadableStream that emits progress updates
 */
export async function streamProcessUnprocessedItems() {
  const encoder = new TextEncoder();

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background
  processUnprocessedItemsInternal(writer);

  // Return the readable stream
  return stream.readable;

  async function processUnprocessedItemsInternal(
    writer: WritableStreamDefaultWriter,
  ) {
    try {
      const supabase = createServerSupabaseClient();

      // Send initial progress update
      await sendProgress(writer, {
        status: 'started',
        message: 'Starting EXIF processing',
      });

      // Get all media files that don't have EXIF data yet and are not ignored file types
      const { data: fileTypes } = await supabase
        .from('file_types')
        .select('extension')
        .eq('ignore', true);

      const ignoredExtensions =
        fileTypes?.map((ft) => ft.extension.toLowerCase()) || [];

      // Get the total count of unprocessed items for progress reporting
      const { count: totalCount, error: countError } = await supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false)
        .filter(
          'extension',
          'not.in',
          `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
        );

      if (countError) {
        await sendProgress(writer, {
          status: 'error',
          message: `Error counting unprocessed items: ${countError.message}`,
          error: countError.message,
        });
        await writer.close();
        return;
      }

      await sendProgress(writer, {
        status: 'processing',
        message: `Found ${totalCount} unprocessed items`,
        filesDiscovered: totalCount || 0,
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
      });

      if (!totalCount || totalCount === 0) {
        await sendProgress(writer, {
          status: 'completed',
          message: 'No files to process',
          filesDiscovered: 0,
          filesProcessed: 0,
          successCount: 0,
          failedCount: 0,
        });
        await writer.close();
        return;
      }

      // Process items in batches to avoid loading too many at once
      const batchSize = 50;
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let offset = 0;

      while (processedCount < totalCount) {
        // Fetch the next batch
        const { data: mediaFiles, error } = await supabase
          .from('media_items')
          .select('id, file_path, extension, file_name')
          .eq('processed', false)
          .filter(
            'extension',
            'not.in',
            `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
          )
          .range(offset, offset + batchSize - 1)
          .order('id', { ascending: true });

        if (error) {
          await sendProgress(writer, {
            status: 'error',
            message: `Error fetching batch of media items: ${error.message}`,
            filesDiscovered: totalCount,
            filesProcessed: processedCount,
            successCount: successCount,
            failedCount: failedCount,
            error: error.message,
          });
          await writer.close();
          return;
        }

        if (!mediaFiles || mediaFiles.length === 0) {
          break; // No more items to process
        }

        // Process each media file in the batch
        for (const media of mediaFiles) {
          try {
            // Send update before processing each file
            await sendProgress(writer, {
              status: 'processing',
              message: `Processing ${processedCount + 1} of ${totalCount}: ${media.file_name}`,
              filesDiscovered: totalCount,
              filesProcessed: processedCount,
              successCount: successCount,
              failedCount: failedCount,
              currentFilePath: media.file_path,
            });

            const result = await processExifData(media.id);

            // Update counters
            processedCount++;
            if (result.success) {
              successCount++;
            } else {
              failedCount++;
            }

            // Send regular progress updates
            if (processedCount % 5 === 0 || processedCount === totalCount) {
              await sendProgress(writer, {
                status: 'processing',
                message: `Processed ${processedCount} of ${totalCount} files (${successCount} successful, ${failedCount} failed)`,
                filesDiscovered: totalCount,
                filesProcessed: processedCount,
                successCount: successCount,
                failedCount: failedCount,
              });
            }
          } catch (error: any) {
            console.error(`Error processing file ${media.file_path}:`, error);

            processedCount++;
            failedCount++;

            // Send error update
            await sendProgress(writer, {
              status: 'processing',
              message: `Error processing file: ${error.message}`,
              filesDiscovered: totalCount,
              filesProcessed: processedCount,
              successCount: successCount,
              failedCount: failedCount,
              error: error.message,
              currentFilePath: media.file_path,
            });
          }
        }

        // Update offset for the next batch
        offset += mediaFiles.length;
      }

      // Revalidate paths to update UI
      try {
        revalidatePath('/browse');
        revalidatePath('/folders');
        revalidatePath('/admin');
      } catch (error) {
        console.error('Error revalidating paths:', error);
      }

      // Send final progress update
      await sendProgress(writer, {
        status: 'completed',
        message: `EXIF processing completed. Processed ${processedCount} files: ${successCount} successful, ${failedCount} failed.`,
        filesDiscovered: totalCount,
        filesProcessed: processedCount,
        successCount: successCount,
        failedCount: failedCount,
      });

      // Close the stream
      await writer.close();
    } catch (error: any) {
      console.error('Error during EXIF processing:', error);
      await sendProgress(writer, {
        status: 'error',
        message: 'Error during EXIF processing',
        error: error.message,
      });
      await writer.close();
    }
  }

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: ExifProgress,
  ) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
  }
}

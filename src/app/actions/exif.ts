'use server';

import fs from 'node:fs/promises';
import { addAbortToken, isAborted } from '@/lib/abort-tokens';
import { extractMetadata } from '@/lib/exif-utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { extractDateFromFilename, isSkippedLargeFile } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import type {
  ExifProcessingOptions,
  ExifProgress,
  ExtractionMethod,
} from '@/types/exif';
import type { Json } from '@/types/supabase';
import { revalidatePath } from 'next/cache';

export async function processMediaExif({
  media,
  method,
}: { media: MediaItem; method: ExtractionMethod }) {
  try {
    if (!media.id || !media.file_path) {
      return { success: false, message: 'Invalid media item' };
    }

    if (!method) {
      return { success: false, message: 'Invalid method' };
    }

    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    // Check if file exists
    await fs.access(media.file_path);

    // Extract EXIF data from the file
    const exifData = await extractMetadata({
      filePath: media.file_path,
      method,
    });

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
      .eq('id', media.id);

    if (error) {
      console.error('Error updating media with EXIF data:', error);
      return { success: false, message: error.message };
    }

    // Revalidate relevant paths to update the UI
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath(`/media/${media.id}`);

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

export async function batchProcessExif({
  folderPath,
  method,
}: { folderPath: string; method: ExtractionMethod }) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    // Get all media files that don't have EXIF data yet
    const { data: mediaFiles, error } = await supabase
      .from('media_items')
      .select('*')
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
      const result = await processMediaExif({ media, method });
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

    // Get ignored file types first for consistent filtering
    const { data: fileTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      fileTypes?.map((ft) => ft.extension.toLowerCase()) || [];

    // Get the list of EXIF-supported extensions for filtering directly in the database
    // Define list of supported extensions - must match what isExifSupportedExtension uses
    const exifSupportedExtensions = ['jpg', 'jpeg', 'tiff', 'heic'];

    // Prepare the filter expressions
    const ignoreFilterExpr =
      ignoredExtensions.length > 0
        ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
        : null;

    const exifSupportedFilterExpr = `(${exifSupportedExtensions.map((ext) => `"${ext}"`).join(',')})`;

    // Get count of media with EXIF data
    let withExifQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('has_exif', true);

    // Apply ignore filter if we have ignored extensions
    if (ignoreFilterExpr) {
      withExifQuery = withExifQuery.filter(
        'extension',
        'not.in',
        ignoreFilterExpr,
      );
    }

    const { count: withExif, error: withExifError } = await withExifQuery;

    // Get count of media that was processed but couldn't extract EXIF data
    let processedNoExifQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('processed', true)
      .eq('has_exif', false);

    // Apply ignore filter if we have ignored extensions
    if (ignoreFilterExpr) {
      processedNoExifQuery = processedNoExifQuery.filter(
        'extension',
        'not.in',
        ignoreFilterExpr,
      );
    }

    const { count: processedNoExif, error: processedNoExifError } =
      await processedNoExifQuery;

    // Get count of unprocessed items
    let unprocessedQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false);

    // Apply ignore filter if we have ignored extensions
    if (ignoreFilterExpr) {
      unprocessedQuery = unprocessedQuery.filter(
        'extension',
        'not.in',
        ignoreFilterExpr,
      );
    }

    const { count: unprocessedCount, error: unprocessedError } =
      await unprocessedQuery;

    // Count only the unprocessed items with EXIF compatible extensions directly in the database
    let unprocessedExifCompatibleQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false)
      .filter('extension', 'in', exifSupportedFilterExpr);

    // Apply ignore filter if we have ignored extensions
    if (ignoreFilterExpr) {
      unprocessedExifCompatibleQuery = unprocessedExifCompatibleQuery.filter(
        'extension',
        'not.in',
        ignoreFilterExpr,
      );
    }

    const {
      count: unprocessedExifCompatibleCount,
      error: unprocessedExifCompatibleError,
    } = await unprocessedExifCompatibleQuery;

    // Get count of all media items (for calculating total EXIF-capable)
    let totalItemsQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });

    // Apply ignore filter if we have ignored extensions
    if (ignoreFilterExpr) {
      totalItemsQuery = totalItemsQuery.filter(
        'extension',
        'not.in',
        ignoreFilterExpr,
      );
    }

    const { count: totalItems, error: totalItemsError } = await totalItemsQuery;

    // Count items with EXIF-compatible extensions directly in the database
    let totalExifCompatibleQuery = supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .filter('extension', 'in', exifSupportedFilterExpr);

    // Apply ignore filter if we have ignored extensions
    if (ignoreFilterExpr) {
      totalExifCompatibleQuery = totalExifCompatibleQuery.filter(
        'extension',
        'not.in',
        ignoreFilterExpr,
      );
    }

    const { count: totalExifCompatibleCount, error: totalExifCompatibleError } =
      await totalExifCompatibleQuery;

    // Check for errors
    if (
      withExifError ||
      processedNoExifError ||
      unprocessedError ||
      totalItemsError ||
      unprocessedExifCompatibleError ||
      totalExifCompatibleError
    ) {
      const error =
        withExifError ||
        processedNoExifError ||
        unprocessedError ||
        totalItemsError ||
        unprocessedExifCompatibleError ||
        totalExifCompatibleError;
      return { success: false, message: error?.message };
    }

    return {
      success: true,
      stats: {
        with_exif: withExif || 0,
        processed_no_exif: processedNoExif || 0,
        total_processed: (withExif || 0) + (processedNoExif || 0),
        unprocessed: unprocessedExifCompatibleCount || 0,
        total: totalExifCompatibleCount || 0,
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

export async function processAllUnprocessedItems({
  count = 100,
  method,
}: { count?: number; method: ExtractionMethod }) {
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
      .select('*')
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
        const result = await processMediaExif({ media, method });

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
export async function updateMediaDatesFromFilenames({
  itemCount = 100,
  updateAll = false,
}: { itemCount?: number; updateAll?: boolean } = {}): Promise<{
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
export async function processExifData({
  mediaId,
  method,
}: { mediaId: string; method: ExtractionMethod }) {
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
    const exifData = await extractMetadata({ filePath, method });

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
export async function streamProcessUnprocessedItems(
  options: ExifProcessingOptions,
) {
  const encoder = new TextEncoder();
  const { skipLargeFiles = false, abortToken, extractionMethod } = options;

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background - passing options as a single object
  processUnprocessedItemsInternal({
    writer,
    skipLargeFiles,
    abortToken,
    extractionMethod,
  });

  // Return the readable stream
  return stream.readable;

  async function processUnprocessedItemsInternal({
    writer,
    skipLargeFiles,
    abortToken,
    extractionMethod,
  }: {
    writer: WritableStreamDefaultWriter;
    skipLargeFiles: boolean;
    abortToken?: string;
    extractionMethod?: ExtractionMethod;
  }) {
    try {
      const supabase = createServerSupabaseClient();

      // Send initial progress update with options info
      const methodInfo =
        extractionMethod && extractionMethod !== 'default'
          ? ` using ${extractionMethod} extraction method`
          : '';

      await sendProgress(writer, {
        status: 'started',
        message: `Starting EXIF processing${methodInfo}${skipLargeFiles ? ' (skipping files over 100MB)' : ''}`,
        method: extractionMethod,
      });

      // Get all media files that don't have EXIF data yet and are not ignored file types
      const { data: fileTypes } = await supabase
        .from('file_types')
        .select('extension')
        .eq('ignore', true);

      const ignoredExtensions =
        fileTypes?.map((ft) => ft.extension.toLowerCase()) || [];

      // First, count the total number of unprocessed items
      const countQuery = supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false)
        .filter(
          'extension',
          'not.in',
          `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
        );

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        await sendProgress(writer, {
          status: 'error',
          message: `Error counting unprocessed items: ${countError.message}`,
          error: countError.message,
          largeFilesSkipped: 0,
          filesDiscovered: 0,
          filesProcessed: 0,
          successCount: 0,
          failedCount: 0,
          method: extractionMethod,
        });
        await writer.close();
        return;
      }

      // Calculate how many items we'll actually process
      const effectiveTotal = totalCount || 0;

      await sendProgress(writer, {
        status: 'processing',
        message: `Found ${totalCount} total unprocessed items to check`,
        filesDiscovered: effectiveTotal,
        largeFilesSkipped: 0,
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
        method: extractionMethod,
      });

      // Process items in chunks to handle large datasets
      const pageSize = 1000;
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let itemsProcessed = 0;
      let exifCompatibleCount = 0;
      let largeFilesSkipped = 0;

      // Process in pages
      for (let page = 0; page * pageSize < (totalCount || 0); page++) {
        // Check for abort signal
        if (abortToken) {
          const isAbortedResult = await isAborted(abortToken);
          if (isAbortedResult) {
            await sendProgress(writer, {
              status: 'error',
              message: 'Processing cancelled by user',
            });
            await writer.close();
            return;
          }
        }
        // Calculate how many items to fetch for this page
        const currentPageSize = pageSize;

        // Get a chunk of unprocessed items
        const { data: unprocessedItems, error: unprocessedError } =
          await supabase
            .from('media_items')
            .select('id, file_path, extension, file_name')
            .eq('processed', false)
            .filter(
              'extension',
              'not.in',
              `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
            )
            .range(page * pageSize, page * pageSize + currentPageSize - 1); // Zero-based pagination

        if (unprocessedError) {
          await sendProgress(writer, {
            status: 'error',
            message: `Error fetching unprocessed items: ${unprocessedError.message}`,
            error: unprocessedError.message,
          });
          await writer.close();
          return;
        }

        // Update progress for this page
        await sendProgress(writer, {
          status: 'processing',
          message: `Processing page ${page + 1} (items ${page * pageSize + 1}-${Math.min(page * pageSize + currentPageSize, totalCount || 0)})`,
          filesDiscovered: effectiveTotal,
          filesProcessed: itemsProcessed,
          successCount: successCount,
          failedCount: failedCount,
        });

        if (!unprocessedItems || unprocessedItems.length === 0) {
          break; // No more items to process
        }

        // Use a single method to filter EXIF supported extensions - using database filtering when possible
        const exifSupportedExtensions = ['jpg', 'jpeg', 'tiff', 'heic'];

        // Filter directly in the query rather than fetching all items first
        const { data: itemsToProcess, error: compatibleItemsError } =
          await supabase
            .from('media_items')
            .select('id, file_path, extension, file_name')
            .eq('processed', false)
            .filter(
              'extension',
              'in',
              `(${exifSupportedExtensions.map((ext) => `"${ext}"`).join(',')})`,
            )
            .filter(
              'extension',
              'not.in',
              `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
            )
            .range(page * pageSize, page * pageSize + currentPageSize - 1);

        if (compatibleItemsError) {
          await sendProgress(writer, {
            status: 'error',
            message: `Error fetching EXIF compatible items: ${compatibleItemsError.message}`,
            error: compatibleItemsError.message,
          });
          await writer.close();
          return;
        }

        if (!itemsToProcess || itemsToProcess.length === 0) {
          continue; // No compatible items on this page
        }

        // Update the count of exif compatible items we found
        const compatibleItemsCount = itemsToProcess.length;
        exifCompatibleCount += compatibleItemsCount;

        // Process each media file in this batch
        const batchSize = 50;
        for (let i = 0; i < itemsToProcess.length; i += batchSize) {
          // Check for abort signal
          if (abortToken && (await isAborted(abortToken))) {
            await sendProgress(writer, {
              status: 'error',
              message: 'Processing cancelled by user',
            });
            await writer.close();
            return;
          }

          // Get the current batch
          const batch = itemsToProcess.slice(i, i + batchSize);

          // Process each media file in the batch
          for (const media of batch) {
            try {
              // Check for abort signal - checking frequently for responsive cancellation
              if (abortToken && (await isAborted(abortToken))) {
                await sendProgress(writer, {
                  status: 'error',
                  message: 'Processing cancelled by user',
                });
                await writer.close();
                return;
              }

              // Check if we should skip this file due to size
              if (skipLargeFiles) {
                try {
                  const stats = await fs.stat(media.file_path);
                  if (isSkippedLargeFile(media.file_path, stats.size)) {
                    // Mark large file as processed but skip EXIF extraction
                    await supabase
                      .from('media_items')
                      .update({
                        processed: true,
                        has_exif: false,
                      })
                      .eq('id', media.id);

                    // Update counters
                    processedCount++;
                    itemsProcessed++;
                    largeFilesSkipped++;

                    // Send progress update for skipped file
                    await sendProgress(writer, {
                      status: 'processing',
                      message: `Skipped large file (over 100MB): ${media.file_name}`,
                      filesDiscovered: effectiveTotal,
                      filesProcessed: itemsProcessed,
                      successCount: successCount,
                      failedCount: failedCount,
                      largeFilesSkipped: largeFilesSkipped,
                      currentFilePath: media.file_path,
                    });

                    continue; // Skip to the next file
                  }
                } catch (statError) {
                  console.error(
                    `Error getting file stats for ${media.file_path}:`,
                    statError,
                  );
                  // Continue with processing if we can't get the file stats
                }
              }

              // Send update before processing each file
              await sendProgress(writer, {
                status: 'processing',
                message: `Processing ${processedCount + 1} of ${exifCompatibleCount} EXIF-compatible files: ${media.file_name}`,
                filesDiscovered: effectiveTotal,
                filesProcessed: itemsProcessed,
                successCount: successCount,
                failedCount: failedCount,
                largeFilesSkipped: largeFilesSkipped,
                currentFilePath: media.file_path,
              });

              const result = await processExifData({
                mediaId: media.id,
                method: extractionMethod || 'default',
              });

              // Update counters
              processedCount++;
              itemsProcessed++;
              if (result.success) {
                successCount++;
              } else {
                failedCount++;
              }

              // Send regular progress updates
              if (
                processedCount % 5 === 0 ||
                processedCount === exifCompatibleCount
              ) {
                // Check for abort signal
                if (abortToken && (await isAborted(abortToken))) {
                  await sendProgress(writer, {
                    status: 'error',
                    message: 'Processing cancelled by user',
                  });
                  await writer.close();
                  return;
                }

                await sendProgress(writer, {
                  status: 'processing',
                  message: `Processed ${processedCount} of ${exifCompatibleCount} files (${successCount} successful, ${failedCount} failed)`,
                  filesDiscovered: effectiveTotal,
                  filesProcessed: itemsProcessed,
                  successCount: successCount,
                  failedCount: failedCount,
                });
              }
            } catch (error: any) {
              console.error(`Error processing file ${media.file_path}:`, error);

              processedCount++;
              itemsProcessed++;
              failedCount++;

              // Send error update
              await sendProgress(writer, {
                status: 'processing',
                message: `Error processing file: ${error.message}`,
                filesDiscovered: effectiveTotal,
                filesProcessed: itemsProcessed,
                successCount: successCount,
                failedCount: failedCount,
                error: error.message,
                currentFilePath: media.file_path,
              });
            }
          }
        }
      }

      // Final check for abort signal before completing
      if (abortToken && (await isAborted(abortToken))) {
        await sendProgress(writer, {
          status: 'error',
          message: 'Processing cancelled by user',
        });
        await writer.close();
        return;
      }

      // Revalidate paths to update UI
      try {
        revalidatePath('/browse');
        revalidatePath('/folders');
        revalidatePath('/admin');
      } catch (error) {
        console.error('Error revalidating paths:', error);
      }

      // Prepare final message
      let finalMessage = `EXIF processing completed. Found ${totalCount} total items, processed ${processedCount} EXIF-compatible files: ${successCount} successful, ${failedCount} failed`;

      if (largeFilesSkipped) {
        finalMessage += `, ${largeFilesSkipped} large files skipped`;
      }

      // Send final progress update
      await sendProgress(writer, {
        status: 'completed',
        message: finalMessage,
        filesDiscovered: effectiveTotal,
        filesProcessed: itemsProcessed,
        successCount: successCount,
        failedCount: failedCount,
        largeFilesSkipped: largeFilesSkipped,
        method: extractionMethod,
      });

      // Close the stream
      await writer.close();
    } catch (error: any) {
      console.error('Error during EXIF processing:', error);
      await sendProgress(writer, {
        status: 'error',
        message: 'Error during EXIF processing',
        error: error.message,
        largeFilesSkipped: 0,
        filesDiscovered: 0,
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
        method: extractionMethod,
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

/**
 * Abort EXIF processing by token
 */
export async function abortExifProcessing(token: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await addAbortToken(token);
    return {
      success: true,
      message: 'Processing aborted successfully',
    };
  } catch (error: any) {
    console.error('Error aborting EXIF processing:', error);
    return {
      success: false,
      message: `Error aborting processing: ${error.message || 'Unknown error'}`,
    };
  }
}

'use server';

import fs from 'node:fs/promises';
import { addAbortToken, isAborted } from '@/lib/abort-tokens';
import { BATCH_SIZE } from '@/lib/consts';
import { extractMetadata } from '@/lib/exif-utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { extractDateFromFilename, isSkippedLargeFile } from '@/lib/utils';
import type {
  ExifProcessingOptions,
  ExifProgress,
  ExtractionMethod,
} from '@/types/exif';
import type { Json } from '@/types/supabase';
import { revalidatePath } from 'next/cache';

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

    // Define list of supported extensions
    const exifSupportedExtensions = ['jpg', 'jpeg', 'tiff', 'heic'];

    // Generate the NOT IN filter expression for ignored extensions
    const ignoreFilterExpr =
      ignoredExtensions.length > 0
        ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
        : '("")';

    // Get total count of EXIF compatible items
    const { count: totalCompatibleCount, error: totalCompatibleError } =
      await supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .in('extension', exifSupportedExtensions)
        .not('extension', 'in', ignoreFilterExpr);

    if (totalCompatibleError) {
      console.error('Error with total compatible count:', totalCompatibleError);
      return { success: false, message: totalCompatibleError.message };
    }

    // Get items with EXIF data (with same extension filtering as total)
    const { count: withExifCount, error: withExifError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('has_exif', true)
      .in('extension', exifSupportedExtensions) // Only count EXIF-compatible extensions
      .not('extension', 'in', ignoreFilterExpr);

    if (withExifError) {
      console.error('Error with has_exif count:', withExifError);
      return { success: false, message: withExifError.message };
    }

    // Get items that are processed but don't have EXIF (with same extension filtering as total)
    const { count: processedNoExifCount, error: processedNoExifError } =
      await supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .eq('processed', true)
        .eq('has_exif', false)
        .in('extension', exifSupportedExtensions) // Only count EXIF-compatible extensions
        .not('extension', 'in', ignoreFilterExpr);

    if (processedNoExifError) {
      console.error(
        'Error with processed_no_exif count:',
        processedNoExifError,
      );
      return { success: false, message: processedNoExifError.message };
    }

    // Get unprocessed items that are EXIF compatible
    const { count: unprocessedCount, error: unprocessedError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false)
      .in('extension', exifSupportedExtensions)
      .not('extension', 'in', ignoreFilterExpr);

    if (unprocessedError) {
      console.error('Error with unprocessed count:', unprocessedError);
      return { success: false, message: unprocessedError.message };
    }

    // Calculate statistics - now with consistent filtering
    const withExif = withExifCount || 0;
    const processedNoExif = processedNoExifCount || 0;
    const unprocessedCount2 = unprocessedCount || 0;
    const totalExifCompatibleCount = totalCompatibleCount || 0;

    return {
      success: true,
      stats: {
        with_exif: withExif,
        processed_no_exif: processedNoExif,
        total_processed: withExif + processedNoExif,
        unprocessed: unprocessedCount2,
        total: totalExifCompatibleCount,
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
  } finally {
    // Revalidate paths after all operations
    revalidatePath('/browse');
    revalidatePath('/admin');
  }
}

/**
 * Process EXIF data for a single media item by ID
 * This function is used by the batch processing implementation
 */
export async function processExifData({
  mediaId,
  method,
  progressCallback,
}: {
  mediaId: string;
  method: ExtractionMethod;
  progressCallback?: (message: string) => void;
}) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    progressCallback?.('Fetching media item details');

    // First get the media item to access its file path
    const { data: mediaItem, error: fetchError } = await supabase
      .from('media_items')
      .select('file_path, file_name')
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
    progressCallback?.(`Processing ${mediaItem.file_name}`);

    // Check if file exists
    try {
      progressCallback?.('Checking file access');
      await fs.access(filePath);
    } catch (fileError) {
      progressCallback?.('File not found');
      // File doesn't exist - mark as processed but with error
      await supabase
        .from('media_items')
        .update({
          processed: true,
          has_exif: false,
          error: `File not found: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
        })
        .eq('id', mediaId);

      return {
        success: false,
        message: `File not found: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
      };
    }

    // Extract EXIF data from the file
    progressCallback?.(`Extracting metadata using ${method} method`);
    const exifData = await extractMetadata({ filePath, method });

    // Even if we don't get EXIF data, mark the file as processed
    if (!exifData) {
      progressCallback?.('No EXIF data found in file');
      // Update the media record to mark as processed but without EXIF
      await supabase
        .from('media_items')
        .update({
          processed: true,
          has_exif: false,
          error: 'No EXIF data extracted',
        })
        .eq('id', mediaId);

      return {
        success: false,
        message:
          'No EXIF data could be extracted, but item marked as processed',
      };
    }

    // Import sanitizeExifData function
    progressCallback?.('Sanitizing EXIF data');
    const { sanitizeExifData } = await import('@/lib/utils');

    // Sanitize EXIF data before storing it
    const sanitizedExifData = sanitizeExifData(exifData);

    // Update the media record in the database
    progressCallback?.('Updating database record with EXIF data');
    const { error } = await supabase
      .from('media_items')
      .update({
        exif_data: sanitizedExifData as Json,
        has_exif: true,
        processed: true,
        error: null, // Clear any previous errors
        // Use correct date property from Photo section
        media_date:
          exifData.Photo?.DateTimeOriginal?.toISOString() ||
          exifData.Image?.DateTime?.toISOString(),
      })
      .eq('id', mediaId);

    if (error) {
      progressCallback?.(`Database error: ${error.message}`);
      console.error('Error updating media with EXIF data:', error);

      // Still mark as processed even if database update fails
      try {
        await supabase
          .from('media_items')
          .update({
            processed: true,
            has_exif: false,
            error: `Database error: ${error.message}`,
          })
          .eq('id', mediaId);
      } catch (updateError) {
        console.error(
          'Error marking as processed after update failure:',
          updateError,
        );
      }

      return { success: false, message: error.message };
    }

    progressCallback?.('EXIF data extraction completed successfully');
    return {
      success: true,
      message: 'EXIF data extracted and stored successfully',
      exifData,
    };
  } catch (error) {
    progressCallback?.(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    console.error('Error processing EXIF data:', error);

    // Even on error, mark the item as processed to avoid retrying problematic files
    try {
      const supabase = createServerSupabaseClient();
      await supabase
        .from('media_items')
        .update({
          processed: true,
          has_exif: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
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

      // Define list of supported extensions - same as in getExifStats
      const exifSupportedExtensions = ['jpg', 'jpeg', 'tiff', 'heic'];

      // First, count the total number of unprocessed items
      // Use the same filtering as getExifStats for consistency
      const countQuery = supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false)
        .in('extension', exifSupportedExtensions) // Only count EXIF-compatible extensions
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
      const pageSize = 500;
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

        // Get a chunk of unprocessed items - use the same filtering as countQuery
        const { data: unprocessedItems, error: unprocessedError } =
          await supabase
            .from('media_items')
            .select('id, file_path, extension, file_name')
            .eq('processed', false)
            .in('extension', exifSupportedExtensions) // Only get EXIF-compatible extensions
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

        // Since we've already filtered for EXIF-compatible extensions in the query,
        // we can process all these items directly
        const itemsToProcess = unprocessedItems;
        exifCompatibleCount = totalCount || 0; // They're all compatible

        // Process each media file in this batch
        const batchSize = BATCH_SIZE;
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
                progressCallback: async (message) => {
                  // Send granular progress updates
                  await sendProgress(writer, {
                    status: 'processing',
                    message: `${message} - ${media.file_name}`,
                    filesDiscovered: effectiveTotal,
                    filesProcessed: itemsProcessed,
                    successCount: successCount,
                    failedCount: failedCount,
                    largeFilesSkipped: largeFilesSkipped,
                    currentFilePath: media.file_path,
                  });
                },
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
    } finally {
      // Close the stream if it hasn't been closed yet
      await writer.close();

      // Revalidate paths to update UI
      revalidatePath('/browse');
      revalidatePath('/admin');
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

/**
 * Get files that failed EXIF data extraction
 */
export async function getFailedExifFiles() {
  try {
    const supabase = createServerSupabaseClient();

    // Get files that are processed but don't have EXIF data
    const { data, error } = await supabase
      .from('media_items')
      .select(
        'id, file_name, file_path, extension, error, size_bytes, processed',
      )
      .eq('processed', true)
      .eq('has_exif', false)
      .order('file_name');

    if (error) {
      console.error('Error fetching failed EXIF files:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error fetching failed EXIF files',
      };
    }

    // Format the response
    const files = data.map((file) => ({
      id: file.id,
      file_name: file.file_name,
      file_path: file.file_path,
      error: file.error,
      extension: file.extension,
      size_bytes: file.size_bytes,
    }));

    return {
      success: true,
      files,
      message: 'Failed EXIF files fetched successfully',
    };
  } catch (error: any) {
    console.error('Error getting failed EXIF files:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Retry EXIF extraction for files that previously failed
 * Server-compatible implementation without client references
 */
export async function retryFailedExifFiles(
  fileIds: string[],
  options: {
    method?: ExtractionMethod;
    skipLargeFiles?: boolean;
    abortToken?: string;
  } = {},
  onProgress?: (processed: number, message?: string) => void,
) {
  try {
    const supabase = createServerSupabaseClient();
    let successCount = 0;
    let processedCount = 0;
    let skippedLargeFiles = 0;
    const { method = 'default', skipLargeFiles = true, abortToken } = options;

    // Process files one by one
    for (const fileId of fileIds) {
      // Check for abort token (server-side version)
      if (abortToken) {
        try {
          const abortRequested = await isAborted(abortToken);
          if (abortRequested) {
            return {
              success: false,
              message: 'Operation was aborted by user',
              processedCount,
              successCount,
              skippedLargeFiles,
            };
          }
        } catch (error) {
          console.error('Error checking abort status:', error);
          // Continue processing even if abort check fails
        }
      }

      try {
        // Reset processed status first
        await supabase
          .from('media_items')
          .update({
            processed: false,
            error: null,
          })
          .eq('id', fileId);

        // Get file info if we need to check file size
        if (skipLargeFiles) {
          const { data: mediaItem } = await supabase
            .from('media_items')
            .select('file_path, size_bytes')
            .eq('id', fileId)
            .single();

          if (!mediaItem) {
            console.warn(`Media item ${fileId} not found`);
            continue;
          }

          // Skip large files if requested
          if (
            skipLargeFiles &&
            mediaItem.size_bytes &&
            mediaItem.size_bytes > BATCH_SIZE * 1024 * 1024 // Use batch size as threshold
          ) {
            skippedLargeFiles++;

            // Update the record to indicate it was skipped
            await supabase
              .from('media_items')
              .update({
                processed: true,
                has_exif: false,
                error: `Skipped large file (${Math.round(mediaItem.size_bytes / 1024 / 1024)}MB)`,
              })
              .eq('id', fileId);

            continue;
          }
        }

        // Check for abort token again before starting the actual processing
        if (abortToken) {
          try {
            const abortRequested = await isAborted(abortToken);
            if (abortRequested) {
              return {
                success: false,
                message: 'Operation was aborted by user',
                processedCount,
                successCount,
                skippedLargeFiles,
              };
            }
          } catch (error) {
            console.error('Error checking abort status:', error);
            // Continue if abort check fails
          }
        }

        // Process EXIF data
        const result = await processExifData({
          mediaId: fileId,
          method,
          progressCallback: (message) => {
            // If we have a progress callback from the caller, use it
            if (onProgress) {
              onProgress(processedCount, message);
            }
          },
        });

        if (result.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing EXIF for file ${fileId}:`, error);
        // Continue with next file
      }

      // Update progress
      processedCount++;
      if (onProgress) {
        onProgress(processedCount);
      }
    }

    // Revalidate paths
    revalidatePath('/admin');
    revalidatePath('/browse');

    return {
      success: true,
      processedCount,
      successCount,
      skippedLargeFiles,
    };
  } catch (error: any) {
    console.error('Error retrying failed EXIF files:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

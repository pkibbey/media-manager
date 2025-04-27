'use server';

import {
  markProcessingError,
  markProcessingSuccess,
} from '@/lib/processing-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { extractDateFromFilename } from '@/lib/utils';

// Define the processing type constant
const PROCESSING_TYPE_TIMESTAMP_CORRECTION = 'timestamp_correction';

/**
 * Update media dates based on filename analysis
 * This helps when EXIF data is missing or corrupt but the filename contains date information
 */
export async function updateMediaDatesFromFilenames({
  itemCount = 100,
  updateAll = false,
}: {
  itemCount?: number;
  updateAll?: boolean;
} = {}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  processed: number;
  updated: number;
  failedExtraction: number; // Add count for failed extractions
  aborted?: boolean;
}> {
  try {
    const supabase = createServerSupabaseClient();
    let isAborted = false;

    // Get items with missing media_date or all items if updateAll is true
    let query = supabase
      .from('media_items')
      .select('id, file_name, media_date, file_types!inner(*)')
      .eq('file_types.ignore', false);

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
        failedExtraction: 0, // Ensure failed count is 0 on error
      };
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        message: 'No files to process',
        processed: 0,
        updated: 0,
        failedExtraction: 0, // Ensure failed count is 0 when no files
      };
    }

    // Process each item sequentially
    let successfulUpdates = 0;
    let failedExtractionCount = 0;
    let failedDbOperationCount = 0; // Count DB errors during processing
    let processedItemsCount = 0;

    for (const item of mediaItems) {
      try {
        processedItemsCount++;

        // Check if the operation has been requested to abort
        if (isAborted) {
          // Mark as aborted
          await markProcessingError({
            mediaItemId: item.id,
            type: PROCESSING_TYPE_TIMESTAMP_CORRECTION,
            errorMessage: 'Processing aborted by user',
          });
          continue;
        }

        // Attempt to process this item
        const extractedDate = extractDateFromFilename(item.file_name);

        if (extractedDate) {
          // Attempt to update the media date
          const { error: updateError } = await supabase
            .from('media_items')
            .update({
              media_date: extractedDate.toISOString(),
            })
            .eq('id', item.id);

          if (updateError) {
            // Use our helper for DB errors
            await markProcessingError({
              mediaItemId: item.id,
              type: PROCESSING_TYPE_TIMESTAMP_CORRECTION,
              errorMessage: `DB update failed: ${updateError.message}`,
            });

            // Throw error to be caught by the outer try/catch for this item
            throw new Error(
              `DB update failed for ${item.file_name}: ${updateError.message}`,
            );
          }

          // Successfully updated the date
          successfulUpdates++;

          // Mark as successful in processing_states
          await markProcessingSuccess({
            mediaItemId: item.id,
            type: PROCESSING_TYPE_TIMESTAMP_CORRECTION,
            errorMessage: 'Date extracted from filename',
          });
        } else {
          // Could not extract date, mark as failed for this type
          failedExtractionCount++;
          console.warn(
            `Could not extract date from filename: ${item.file_name}. Marking as failed.`,
          );

          await markProcessingError({
            mediaItemId: item.id,
            type: PROCESSING_TYPE_TIMESTAMP_CORRECTION,
            errorMessage: 'Could not parse date from filename',
          });
        }
      } catch (itemError: any) {
        // Check if the operation was aborted (possibly by user cancellation)
        if (
          itemError.message?.includes('abort') ||
          itemError.name === 'AbortError'
        ) {
          isAborted = true;

          // Mark this item as aborted
          await markProcessingError({
            mediaItemId: item.id,
            type: PROCESSING_TYPE_TIMESTAMP_CORRECTION,
            errorMessage: 'Processing aborted by user',
          });

          // Continue to next item, which will then be skipped due to isAborted flag
          continue;
        }

        // Catch any error during processing for this specific item
        failedDbOperationCount++;
        console.error(
          `Failed to process timestamp correction for ${item.file_name}:`,
          itemError.message,
        );

        // Attempt to mark this item as failed regardless of the error type
        try {
          await markProcessingError({
            mediaItemId: item.id,
            type: PROCESSING_TYPE_TIMESTAMP_CORRECTION,
            errorMessage:
              itemError.message || 'Unknown error during timestamp correction',
          });
        } catch (markFailedError: any) {
          // Log if even marking as failed didn't work
          console.error(
            `CRITICAL: Could not mark item ${item.id} (${item.file_name}) as failed after initial error: [${itemError.message}]. Marking failed error: [${markFailedError.message}]`,
          );
        }
      }
    }

    return {
      success: true, // The overall batch operation succeeded in running
      message: isAborted
        ? `Processing aborted by user. Processed ${successfulUpdates + failedExtractionCount} files before aborting.`
        : `Processed ${processedItemsCount} files. Updated: ${successfulUpdates}. Failed Extraction: ${failedExtractionCount}. DB Errors: ${failedDbOperationCount}.`,
      processed:
        successfulUpdates + failedExtractionCount + failedDbOperationCount,
      updated: successfulUpdates, // Return the count of successful updates
      failedExtraction: failedExtractionCount + failedDbOperationCount, // Combine failed counts
      aborted: isAborted,
    };
  } catch (error: any) {
    console.error('Error updating media dates from filenames:', error);
    return {
      success: false,
      error: error.message,
      processed: 0,
      updated: 0,
      failedExtraction: 0, // Ensure failed count is 0 on catch
    };
  }
}

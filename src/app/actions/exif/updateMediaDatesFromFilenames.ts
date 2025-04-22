'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { extractDateFromFilename } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

// Define the processing type constant
const PROCESSING_TYPE_TIMESTAMP_CORRECTION = 'timestamp_correction';

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
  failedExtraction: number; // Add count for failed extractions
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

    for (const item of mediaItems) {
      try {
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
            // Throw error to be caught by the outer try/catch for this item
            throw new Error(
              `DB update failed for ${item.file_name}: ${updateError.message}`,
            );
          }
          // Successfully updated the date
          successfulUpdates++;
        } else {
          // Could not extract date, mark as failed for this type
          failedExtractionCount++;
          console.warn(
            `Could not extract date from filename: ${item.file_name}. Marking as failed.`,
          );
          const { error: upsertError } = await supabase
            .from('processing_states')
            .upsert(
              {
                media_item_id: item.id,
                type: PROCESSING_TYPE_TIMESTAMP_CORRECTION,
                status: 'failed',
                processed_at: new Date().toISOString(),
                error_message: 'Could not parse date from filename',
              },
              {
                onConflict: 'media_item_id,type',
              },
            );

          if (upsertError) {
            // Throw error to be caught by the outer try/catch for this item
            throw new Error(
              `DB upsert (failed extraction) failed for ${item.file_name}: ${upsertError.message}`,
            );
          }
        }
      } catch (itemError: any) {
        // Catch any error during processing for this specific item
        failedDbOperationCount++;
        console.error(
          `Failed to process timestamp correction for ${item.file_name}:`,
          itemError.message,
        );

        // Attempt to mark this item as failed regardless of the error type
        try {
          await supabase.from('processing_states').upsert(
            {
              media_item_id: item.id,
              type: PROCESSING_TYPE_TIMESTAMP_CORRECTION,
              status: 'failed',
              processed_at: new Date().toISOString(),
              error_message:
                itemError.message ||
                'Unknown error during timestamp correction',
            },
            {
              onConflict: 'media_item_id,type',
              ignoreDuplicates: false,
            },
          );
        } catch (markFailedError: any) {
          // Log if even marking as failed didn't work
          console.error(
            `CRITICAL: Could not mark item ${item.id} (${item.file_name}) as failed after initial error: [${itemError.message}]. Marking failed error: [${markFailedError.message}]`,
          );
        }
      }
    }

    revalidatePath('/admin');

    return {
      success: true, // The overall batch operation succeeded in running
      message: `Processed ${mediaItems.length} files. Updated: ${successfulUpdates}. Failed Extraction: ${failedExtractionCount}. DB Errors: ${failedDbOperationCount}.`,
      processed: mediaItems.length, // Return the number attempted in this batch
      updated: successfulUpdates, // Return the count of successful updates
      failedExtraction: failedExtractionCount + failedDbOperationCount, // Combine failed counts
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

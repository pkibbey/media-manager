'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type {
  BatchOperationResponse,
  BatchProgress,
} from '@/types/progress-types';
import { revalidatePath } from 'next/cache';
import { processExifData } from './exif';

/**
 * Process EXIF data for multiple media items
 */
export async function batchProcessExif({
  itemIds,
  method,
}: { itemIds: string[]; method: string }): Promise<BatchOperationResponse> {
  try {
    let processedCount = 0;
    let failedCount = 0;

    for (const id of itemIds) {
      try {
        const result = await processExifData({ mediaId: id, method });
        if (result.success) {
          processedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Error processing EXIF for item ${id}:`, error);
        failedCount++;
      }
    }

    return {
      success: true,
      message: `Processed EXIF data for ${processedCount} items.`,
      processedCount,
      failedCount,
    };
  } catch (error: any) {
    console.error('Error in batch EXIF processing:', error);
    return {
      success: false,
      message: 'An error occurred during batch processing.',
      error: error.message,
    };
  } finally {
    // Revalidate paths after all operations
    revalidatePath('/folders');
    revalidatePath('/browse');
  }
}

/**
 * Mark multiple media items as organized
 */
export async function batchMarkOrganized(
  itemIds: string[],
  organized = true,
): Promise<BatchOperationResponse> {
  try {
    const supabase = createServerSupabaseClient();

    const { error, count } = await supabase
      .from('media_items')
      .update({ organized })
      .in('id', itemIds);

    if (error) {
      return {
        success: false,
        message: 'Failed to update items.',
        error: error.message,
      };
    }

    return {
      success: true,
      message: `Marked ${count} items as ${organized ? 'organized' : 'unorganized'}.`,
      processedCount: count || 0,
    };
  } catch (error: any) {
    console.error('Error marking items as organized:', error);
    return {
      success: false,
      message: 'An error occurred during batch processing.',
      error: error.message,
    };
  } finally {
    // Revalidate paths
    revalidatePath('/folders');
    revalidatePath('/browse');
  }
}

/**
 * Delete multiple media items
 */
export async function batchDeleteItems(
  itemIds: string[],
): Promise<BatchOperationResponse> {
  try {
    const supabase = createServerSupabaseClient();

    const { error, count } = await supabase
      .from('media_items')
      .delete()
      .in('id', itemIds);

    if (error) {
      return {
        success: false,
        message: 'Failed to delete items.',
        error: error.message,
      };
    }

    return {
      success: true,
      message: `Deleted ${count} items.`,
      processedCount: count || 0,
    };
  } catch (error: any) {
    console.error('Error deleting items:', error);
    return {
      success: false,
      message: 'An error occurred during batch deletion.',
      error: error.message,
    };
  } finally {
    // Revalidate paths
    revalidatePath('/folders');
    revalidatePath('/browse');
  }
}

/**
 * Stream-based batch processing of EXIF data for multiple media items
 */
export async function streamBatchProcessExif({
  itemIds,
  method,
}: { itemIds: string[]; method: string }) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Process items in the background
  processItemsInBackground(itemIds, writer);

  // Return the readable stream
  return stream.readable;

  async function processItemsInBackground(
    ids: string[],
    writer: WritableStreamDefaultWriter,
  ) {
    try {
      const totalItems = ids.length;
      let processedCount = 0;
      let failedCount = 0;

      await sendProgress(writer, {
        status: 'processing',
        message: `Starting EXIF processing for ${totalItems} items`,
        processedCount: 0,
        totalCount: totalItems,
      });

      for (const id of ids) {
        try {
          const supabase = createServerSupabaseClient();

          // Get the item name for progress reporting
          const { data: item } = await supabase
            .from('media_items')
            .select('file_name')
            .eq('id', id)
            .single();

          const currentItem = item?.file_name || `Item ID: ${id}`;

          // Report current progress
          await sendProgress(writer, {
            status: 'processing',
            message: `Processing ${processedCount + 1} of ${totalItems}`,
            processedCount,
            totalCount: totalItems,
            currentItem,
          });

          // Process the EXIF data
          const result = await processExifData({ mediaId: id, method });

          if (result.success) {
            processedCount++;
          } else {
            failedCount++;
          }

          // Only send periodic updates for large batches
          if (totalItems > 10 && processedCount % 5 === 0) {
            await sendProgress(writer, {
              status: 'processing',
              message: `Processed ${processedCount} of ${totalItems} items`,
              processedCount,
              totalCount: totalItems,
            });
          }
        } catch (error: any) {
          console.error(`Error processing item ${id}:`, error);
          failedCount++;
        }
      }

      // Send final completion update
      await sendProgress(writer, {
        status: 'completed',
        message: `Completed processing EXIF data for ${processedCount} items. ${failedCount > 0 ? `Failed: ${failedCount}` : ''}`,
        processedCount,
        totalCount: totalItems,
      });

      // Revalidate paths
      try {
        revalidatePath('/folders');
        revalidatePath('/browse');
      } catch (error) {
        console.error('Error revalidating paths:', error);
      }

      // Close the stream
      await writer.close();
    } catch (error: any) {
      console.error('Error during batch processing:', error);
      await sendProgress(writer, {
        status: 'error',
        message: 'Error during batch processing',
        error: error.message,
      });
      await writer.close();
    }
  }

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: BatchProgress,
  ) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
  }
}

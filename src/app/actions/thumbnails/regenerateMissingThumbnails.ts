'use server';

import { includeMedia } from '@/lib/mediaFilters';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateThumbnail } from './generateThumbnail';

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

    // Get IDs of media items with success or skipped thumbnail processing
    const { data: successOrSkippedItems, error: successSkippedError } =
      await supabase
        .from('processing_states')
        .select('media_item_id, status')
        .eq('type', 'thumbnail')
        .in('status', ['success', 'skipped']);

    if (successSkippedError) {
      throw new Error(
        `Error fetching successful thumbnails: ${successSkippedError.message}`,
      );
    }

    // Get IDs of media items with error thumbnail processing that we want to retry
    const { data: errorItems, error: errorItemsError } = await supabase
      .from('processing_states')
      .select('media_item_id')
      .eq('type', 'thumbnail')
      .eq('status', 'error');

    if (errorItemsError) {
      throw new Error(
        `Error fetching error thumbnails: ${errorItemsError.message}`,
      );
    }

    // Extract the IDs
    const successOrSkippedIds = (successOrSkippedItems || []).map(
      (item) => item.media_item_id,
    );
    const errorIds = (errorItems || []).map((item) => item.media_item_id);

    // Define our query to get media items without thumbnails
    // First get items that don't have a successful or skipped state
    let query = includeMedia(
      supabase.from('media_items').select('id, file_types!inner(*)'),
    );

    // Generate the NOT IN filter expression for ignored IDs
    const filterExpr =
      successOrSkippedIds.length > 0
        ? `(${successOrSkippedIds.join(',')})`
        : '()';

    // If we have successful/skipped IDs, add the filter to exclude them
    if (successOrSkippedIds.length > 0) {
      query = query.not('id', 'in', filterExpr);
    }

    // If we have error IDs, add the OR condition to include them
    if (errorIds.length > 0) {
      // We need to use the .or() method with a filter using .in()
      query = query.or(`id.in.(${errorIds.join(',')})`);
    }

    // Execute the query
    const { data: items, error } = await query;

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
        const result = await generateThumbnail(item.id);

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

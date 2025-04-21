'use server';

import { getIgnoredFileTypeIds } from '@/lib/query-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function getExifStats() {
  try {
    const supabase = createServerSupabaseClient();

    // Get ignored file type IDs for consistent filtering
    const ignoredIds = await getIgnoredFileTypeIds();

    // Generate the NOT IN filter expression for ignored IDs
    const ignoreFilterExpr =
      ignoredIds.length > 0 ? `(${ignoredIds.join(',')})` : '()';

    // Get total count of all items, excluding only explicitly ignored file types
    const { count: totalItemsCount, error: totalItemsError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact' })
      .not('file_type_id', 'in', ignoreFilterExpr);

    if (totalItemsError || totalItemsCount === null) {
      console.error('Error with total items count:', totalItemsError);
      return {
        success: false,
        message: totalItemsError?.message
          ? totalItemsError.message
          : 'Total items count is null',
      };
    }

    // Get items with successful EXIF data using the processing_states table
    const { count: withExifCount, error: withExifError } = await supabase
      .from('processing_states')
      .select('media_item_id', { count: 'exact' })
      .eq('type', 'exif')
      .eq('status', 'success');

    if (withExifError) {
      console.error('Error with exif success count:', withExifError);
      return { success: false, message: withExifError.message };
    }

    // Get items that were processed but don't have EXIF (skipped or unsupported)
    const { count: processedNoExifCount, error: processedNoExifError } =
      await supabase
        .from('processing_states')
        .select('media_item_id', { count: 'exact' })
        .eq('type', 'exif')
        .in('status', ['skipped', 'unsupported']);

    if (processedNoExifError) {
      console.error(
        'Error with processed_no_exif count:',
        processedNoExifError,
      );
      return { success: false, message: processedNoExifError.message };
    }

    // Get all media item IDs that have any processing state for EXIF
    const { data: processedMediaIds, error: processedMediaIdsError } =
      await supabase
        .from('processing_states')
        .select('media_item_id')
        .eq('type', 'exif');

    if (processedMediaIdsError) {
      console.error(
        'Error getting processed media IDs:',
        processedMediaIdsError,
      );
      return { success: false, message: processedMediaIdsError.message };
    }

    // Extract the IDs of all processed items
    const processedIds = processedMediaIds.map((item) => item.media_item_id);

    // If there are no processed IDs yet, all files are considered unprocessed
    let unprocessedCount = 0;

    if (processedIds.length === 0) {
      unprocessedCount = totalItemsCount || 0;
    } else {
      // Count unprocessed items by subtracting processed count from total count
      unprocessedCount = Math.max(0, totalItemsCount - processedIds.length);
    }

    // Calculate statistics
    const withExif = withExifCount || 0;
    const processedNoExif = processedNoExifCount || 0;
    const totalCount = totalItemsCount || 0;

    return {
      success: true,
      stats: {
        with_exif: withExif,
        processed_no_exif: processedNoExif,
        total_processed: withExif + processedNoExif,
        unprocessed: unprocessedCount,
        total: totalCount,
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

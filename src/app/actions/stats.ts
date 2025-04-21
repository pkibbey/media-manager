'use server';
import { getIgnoredFileTypeIds } from '@/lib/query-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaStats } from '@/types/media-types';
import { revalidatePath } from 'next/cache';

/**
 * Get comprehensive statistics about media items in the system
 */
export async function getMediaStats(): Promise<{
  success: boolean;
  data?: MediaStats;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get ignored file type IDs for consistent filtering
    const ignoredTypeIds = await getIgnoredFileTypeIds();

    // Get total count of non-ignored media items
    const { count: totalCount, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact' })
      .not('file_type_id', 'in', `(${ignoredTypeIds.join(',')})`);

    if (countError) {
      console.error('GET: Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // Get total size of all media
    const { data: sizeData, error: sizeError } = await supabase
      .rpc('sum_file_sizes')
      .single();

    if (sizeError) {
      console.error('Error calculating total size:', sizeError);
      return { success: false, error: sizeError.message };
    }

    // Get count of processed items (with exif_data)
    const { count: processedCount, error: processedError } = await supabase
      .from('processing_states')
      .select('media_item_id', { count: 'exact' })
      .eq('type', 'exif')
      .eq('status', 'success');

    if (processedError) {
      console.error('Error counting processed items:', processedError);
      return { success: false, error: processedError.message };
    }

    // Get count of items with successful EXIF processing but no media_date
    const { count: needsTimestampCorrectionCount, error: timestampError } =
      await supabase
        .from('media_items')
        .select('id', { count: 'exact' })
        .is('media_date', null)
        .not('file_type_id', 'in', `(${ignoredTypeIds.join(',')})`);

    if (timestampError) {
      console.error(
        'Error counting items needing timestamp correction:',
        timestampError,
      );
      return { success: false, error: timestampError.message };
    }

    // Get count of ignored files
    const { count: ignoredCount, error: ignoredError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact' })
      .not('file_type_id', 'in', `(${ignoredTypeIds.join(',')})`);

    if (ignoredError) {
      console.error('Error counting ignored items:', ignoredError);
      return { success: false, error: ignoredError.message };
    }

    // Get items grouped by category
    const { data: categoryData, error: categoryError } = await supabase
      .from('media_items')
      .select('file_types(category)')
      .not('file_type_id', 'is', null);

    if (categoryError) {
      console.error('Error getting category data:', categoryError);
      return { success: false, error: categoryError.message };
    }

    // Build category count map
    const itemsByCategory: Record<string, number> = {};
    categoryData?.forEach((item) => {
      const category = (item.file_types as any)?.category || 'unknown';
      itemsByCategory[category] = (itemsByCategory[category] || 0) + 1;
    });

    // Get items grouped by extension - using the RPC function instead of direct query
    const { data: extensionStats, error: extensionError } = await supabase.rpc(
      'get_extension_statistics',
    );

    if (extensionError) {
      console.error('Error getting extension data:', extensionError);
      return { success: false, error: extensionError.message };
    }

    // Build extension count map from the results
    const itemsByExtension: Record<string, number> = {};
    extensionStats?.forEach((item) => {
      itemsByExtension[item.extension] = item.count;
    });

    return {
      success: true,
      data: {
        totalMediaItems: totalCount || 0,
        totalSizeBytes: sizeData?.sum || 0,
        processedCount: processedCount || 0,
        unprocessedCount: (totalCount || 0) - (processedCount || 0),
        ignoredCount: ignoredCount || 0,
        needsTimestampCorrectionCount: needsTimestampCorrectionCount || 0,
        itemsByCategory,
        itemsByExtension,
      },
    };
  } catch (error: any) {
    console.error('Error fetching media stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear all media items from database
 */
export async function clearAllMediaItems(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get total count for confirmation message
    const { count, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact' });

    if (countError) {
      console.error('CLEAR: Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // Delete all media items
    const { error: deleteError } = await supabase
      .from('media_items')
      .delete()
      .filter('id', 'not.is', null); // Select all non-null IDs (all rows)

    if (deleteError) {
      console.error('Error deleting media items:', deleteError);
      return { success: false, error: deleteError.message };
    }

    return {
      success: true,
      message: `Successfully removed ${count} media items from the database.`,
    };
  } catch (error: any) {
    console.error('Error clearing media items:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset the processing state of all media items
 * This will mark all items as unprocessed so they can be re-processed
 */
export async function resetAllMediaItems(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get total count for confirmation message
    const { count, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact' });

    if (countError) {
      console.error('RESET: Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // First, clear the exif_data and media_date fields in media_items
    const { error: updateMediaError } = await supabase
      .from('media_items')
      .update({
        exif_data: null,
        media_date: null,
      })
      .filter('id', 'not.is', null);

    if (updateMediaError) {
      console.error('Error updating media items:', updateMediaError);
      return { success: false, error: updateMediaError.message };
    }

    // Then reset all processing states to pending/outdated
    const { error: deleteError } = await supabase
      .from('processing_states')
      .delete()
      .neq('id', 0); // Delete all processing states

    if (deleteError) {
      console.error('Error resetting processing states:', deleteError);
      return { success: false, error: deleteError.message };
    }

    return {
      success: true,
      message: `Successfully reset ${count} media items to unprocessed state.`,
    };
  } catch (error: any) {
    console.error('Error resetting media items:', error);
    return { success: false, error: error.message };
  } finally {
    // Revalidate paths after all operations
    revalidatePath('/browse');
    revalidatePath('/admin');
  }
}

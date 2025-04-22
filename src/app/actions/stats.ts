'use server';
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

    // Get total count of non-ignored media items
    const { count: totalCount, error: countError } = await supabase
      .from('media_items')
      .select('*, file_types(*)', { count: 'exact', head: true });

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
    const { count: successfulExifCount, error: processedError } = await supabase
      .from('processing_states')
      .select('media_item_id', { count: 'exact', head: true })
      .eq('type', 'exif')
      .eq('status', 'success');

    if (processedError) {
      console.error('Error counting processed items:', processedError);
      return { success: false, error: processedError.message };
    }

    // Get count of items that were processed but don't have EXIF data (skipped or unsupported)
    const { count: processedNoExifCount, error: processedNoExifError } =
      await supabase
        .from('processing_states')
        .select('media_item_id', { count: 'exact', head: true })
        .eq('type', 'exif')
        .in('status', ['skipped', 'error']);

    if (processedNoExifError) {
      console.error('Error counting items with no EXIF:', processedNoExifError);
      return { success: false, error: processedNoExifError.message };
    }

    // Calculate total processed count - both successful and no-exif items
    const processedCount =
      (successfulExifCount || 0) + (processedNoExifCount || 0);

    // Define the processing type constant used for timestamp correction
    const PROCESSING_TYPE_TIMESTAMP_CORRECTION = 'timestamp_correction';

    // Subquery to find IDs that have failed timestamp correction
    const { data: failedTimeStampCorrectionIds } = await supabase
      .from('processing_states')
      .select('media_item_id')
      .eq('type', PROCESSING_TYPE_TIMESTAMP_CORRECTION)
      .eq('status', 'failed');

    // Extract IDs from the subquery result
    const failedTimestampCorrectionIdsQuery =
      failedTimeStampCorrectionIds?.map((item) => item.media_item_id) || [];
    // Generate the NOT IN filter expression for failed timestamp correction IDs
    const failedTimestampCorrectionIdsExpr =
      failedTimestampCorrectionIdsQuery.length > 0
        ? `(${failedTimestampCorrectionIdsQuery.join(',')})`
        : '()';

    // Get count of items needing timestamp correction
    // (media_date is null AND not ignored AND not already failed timestamp correction)
    const { count: needsTimestampCorrectionCount, error: timestampError } =
      await supabase
        .from('media_items')
        .select('id', { count: 'exact', head: true })
        .is('media_date', null)
        // .not('file_type_id', 'in', ignoreFilterExpr)
        // Exclude items that have already failed timestamp correction
        .not('id', 'in', failedTimestampCorrectionIdsExpr);

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
      .select('*', { count: 'exact', head: true });
    // .not('file_type_id', 'in', ignoreFilterExpr);

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

    // Delete all media items
    const { error: deleteError, count } = await supabase
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
export async function resetEverything(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get total count for confirmation message
    const { count, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('RESET: Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // First, delete all media items
    const { error: deleteMediaError } = await supabase
      .from('media_items')
      .delete()
      .filter('id', 'not.is', null);

    if (deleteMediaError) {
      console.error('Error updating media items:', deleteMediaError);
      return { success: false, error: deleteMediaError.message };
    }

    // Delete all processing states
    const { error: deleteError } = await supabase
      .from('processing_states')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('Error resetting processing states:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Then delete all file types
    const { error: deleteFileTypesError } = await supabase
      .from('file_types')
      .delete()
      .neq('id', 0); // Delete all file types

    if (deleteFileTypesError) {
      console.error('Error deleting file types:', deleteFileTypesError);
      return { success: false, error: deleteFileTypesError.message };
    }

    // Revalidate paths after all operations
    await revalidatePath('/admin');

    return {
      success: true,
      message: `Successfully reset ${count} media items to unprocessed state.`,
    };
  } catch (error: any) {
    console.error('Error resetting media items:', error);

    return { success: false, error: error.message };
  } finally {
    // Revalidate paths after all operations
  }
}

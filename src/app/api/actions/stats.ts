'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaStats } from '@/types';

/**
 * Get media statistics
 */
export async function getMediaStats(): Promise<{
  success: boolean;
  data?: MediaStats;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get total count of media items
    const { count: totalCount, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // Get sum of all file sizes
    const { data: sizeData, error: sizeError } = await supabase
      .from('media_items')
      .select('size_bytes')
      .returns<{ size_bytes: number }[]>();

    if (sizeError) {
      console.error('Error getting file sizes:', sizeError);
      return { success: false, error: sizeError.message };
    }

    const totalSizeBytes = sizeData.reduce(
      (acc, item) => acc + item.size_bytes,
      0,
    );

    // Get item counts by category
    const { data: fileTypeData, error: fileTypeError } = await supabase
      .from('file_types')
      .select('extension, category');

    if (fileTypeError) {
      console.error('Error getting file types:', fileTypeError);
      return { success: false, error: fileTypeError.message };
    }

    const extensionToCategory = fileTypeData.reduce(
      (acc, item) => {
        acc[item.extension] = item.category;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Get the count of items by extension
    const { data: extensionData, error: extensionError } = await supabase
      .from('media_items')
      .select('extension');

    if (extensionError) {
      console.error('Error getting media extensions:', extensionError);
      return { success: false, error: extensionError.message };
    }

    // Count items by extension
    const itemsByExtension: Record<string, number> = {};
    extensionData.forEach((item) => {
      const extension = item.extension;
      itemsByExtension[extension] = (itemsByExtension[extension] || 0) + 1;
    });

    // Count items by category using the mapping
    const itemsByCategory: Record<string, number> = {};
    extensionData.forEach((item) => {
      const extension = item.extension;
      const category = extensionToCategory[extension] || 'Other';
      itemsByCategory[category] = (itemsByCategory[category] || 0) + 1;
    });

    // Get counts for processed and organized items
    const { data: processedData, error: processedError } = await supabase
      .from('media_items')
      .select('processed, organized')
      .returns<{ processed: boolean; organized: boolean }[]>();

    if (processedError) {
      console.error('Error getting processed status:', processedError);
      return { success: false, error: processedError.message };
    }

    const processedCount = processedData.filter(
      (item) => item.processed,
    ).length;
    const organizedCount = processedData.filter(
      (item) => item.organized,
    ).length;

    const mediaStats: MediaStats = {
      totalMediaItems: totalCount || 0,
      totalSizeBytes,
      itemsByCategory,
      itemsByExtension,
      processedCount,
      unprocessedCount: (totalCount || 0) - processedCount,
      organizedCount,
      unorganizedCount: (totalCount || 0) - organizedCount,
    };

    return { success: true, data: mediaStats };
  } catch (error: any) {
    console.error('Error getting media stats:', error);
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
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // Delete all media items
    const { error: deleteError } = await supabase
      .from('media_items')
      .delete()
      .neq('id', ''); // Always true condition to delete all

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
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // Reset all media items by marking them as unprocessed
    // Use filter TRUE to select all rows instead of .neq('id', '')
    const { error: updateError } = await supabase
      .from('media_items')
      .update({
        processed: false,
        has_exif: false,
        exif_data: null,
        media_date: null,
        width: null,
        height: null,
        duration_seconds: null,
        thumbnail_path: null,
      })
      .filter('id', 'not.is', null); // Select all non-null IDs (all rows)

    if (updateError) {
      console.error('Error resetting media items:', updateError);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      message: `Successfully reset ${count} media items to unprocessed state.`,
    };
  } catch (error: any) {
    console.error('Error resetting media items:', error);
    return { success: false, error: error.message };
  }
}

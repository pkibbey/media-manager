'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaStats } from '@/types/media-types';
import { revalidatePath } from 'next/cache';

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

    // Fetch all file type information in a single query to get both ignored types and categories
    const { data: fileTypes, error: fileTypesError } = await supabase
      .from('file_types')
      .select('extension, category, ignore');

    if (fileTypesError) {
      console.error('Error fetching file types:', fileTypesError);
      return { success: false, error: fileTypesError.message };
    }

    // Build maps of file type information
    const ignoredExtensions: string[] = [];
    const extensionToCategory: Record<string, string> = {};

    fileTypes?.forEach((fileType) => {
      const ext = fileType.extension.toLowerCase();
      if (fileType.ignore) {
        ignoredExtensions.push(ext);
      }
      extensionToCategory[ext] = fileType.category;
    });

    // Define the structure of our stats result
    interface StatsResult {
      total_count: number;
      total_size_bytes: number;
      processed_count: number;
      unprocessed_count: number;
      organized_count: number;
      unorganized_count: number;
    }

    // Use standard queries first as a safer approach
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .not(
        'extension',
        'in',
        ignoredExtensions.length > 0
          ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
          : '("")',
      );

    if (countError) {
      console.error('Error getting total count:', countError);
      return { success: false, error: countError.message };
    }

    // Get total size
    const { data: sizeData, error: sizeError } = await supabase
      .from('media_items')
      .select('size_bytes')
      .not(
        'extension',
        'in',
        ignoredExtensions.length > 0
          ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
          : '("")',
      );

    if (sizeError) {
      console.error('Error getting size data:', sizeError);
      return { success: false, error: sizeError.message };
    }

    // Calculate total size
    const totalSizeBytes =
      sizeData?.reduce((sum, item) => sum + (item.size_bytes || 0), 0) || 0;

    // Get processed count
    const { count: processedCount, error: processedError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('processed', true)
      .not(
        'extension',
        'in',
        ignoredExtensions.length > 0
          ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
          : '("")',
      );

    if (processedError) {
      console.error('Error getting processed count:', processedError);
      return { success: false, error: processedError.message };
    }

    // Get organized count
    const { count: organizedCount, error: organizedError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('organized', true)
      .not(
        'extension',
        'in',
        ignoredExtensions.length > 0
          ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
          : '("")',
      );

    if (organizedError) {
      console.error('Error getting organized count:', organizedError);
      return { success: false, error: organizedError.message };
    }

    // Create stats object from standard queries
    const statsResult: StatsResult = {
      total_count: totalCount || 0,
      total_size_bytes: totalSizeBytes,
      processed_count: processedCount || 0,
      unprocessed_count: (totalCount || 0) - (processedCount || 0),
      organized_count: organizedCount || 0,
      unorganized_count: (totalCount || 0) - (organizedCount || 0),
    };

    // Define the structure for extension results
    interface ExtensionResult {
      extension: string;
      count: number;
      category: string;
    }

    // Get extension counts with standard query
    const { data: extensionCounts, error: extensionError } = await supabase
      .from('media_items')
      .select('extension')
      .not(
        'extension',
        'in',
        ignoredExtensions.length > 0
          ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
          : '("")',
      );

    if (extensionError) {
      console.error('Error getting extensions:', extensionError);
      return { success: false, error: extensionError.message };
    }

    // Process extension counts manually
    const extensionCounting: Record<string, number> = {};
    extensionCounts?.forEach((item) => {
      const ext = item.extension.toLowerCase();
      extensionCounting[ext] = (extensionCounting[ext] || 0) + 1;
    });

    // Convert to array of extension results
    const extensionResults: ExtensionResult[] = Object.entries(
      extensionCounting,
    ).map(([extension, count]) => ({
      extension,
      count,
      category: extensionToCategory[extension] || 'other',
    }));

    // Process extension counts and build category counts
    const itemsByCategory: Record<string, number> = {};
    const itemsByExtension: Record<string, number> = {};

    extensionResults.forEach((item) => {
      const ext = item.extension.toLowerCase();
      const count = Number(item.count);

      // Add to extension counts
      itemsByExtension[ext] = count;

      // Add to category counts
      const category = item.category || extensionToCategory[ext] || 'other';
      itemsByCategory[category] = (itemsByCategory[category] || 0) + count;
    });

    // Count ignored items if relevant
    let ignoredCount = 0;
    if (ignoredExtensions.length > 0) {
      const { count, error: ignoredError } = await supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .in('extension', ignoredExtensions);

      if (ignoredError) {
        console.error('Error counting ignored items:', ignoredError);
      } else {
        ignoredCount = count || 0;
      }
    }

    const mediaStats: MediaStats = {
      totalMediaItems: statsResult.total_count,
      totalSizeBytes: statsResult.total_size_bytes,
      itemsByCategory,
      itemsByExtension,
      processedCount: statsResult.processed_count,
      unprocessedCount: statsResult.unprocessed_count,
      organizedCount: statsResult.organized_count,
      unorganizedCount: statsResult.unorganized_count,
      ignoredCount,
    };

    return { success: true, data: mediaStats };
  } catch (error: any) {
    console.error('Error getting media stats:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
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

    // Revalidate paths to update UI
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Successfully reset ${count} media items to unprocessed state.`,
    };
  } catch (error: any) {
    console.error('Error resetting media items:', error);
    return { success: false, error: error.message };
  }
}

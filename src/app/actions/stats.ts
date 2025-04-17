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

      // Track ignored extensions
      if (fileType.ignore) {
        ignoredExtensions.push(ext);
      }

      // Map extension to its category
      extensionToCategory[ext] = fileType.category;
    });

    // Build the ignore filter expression for SQL queries
    const ignoreFilter =
      ignoredExtensions.length > 0
        ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
        : null;

    // Initialize data structures
    const itemsByCategory: Record<string, number> = {};
    const itemsByExtension: Record<string, number> = {};

    // Get total size using the correct Supabase aggregation syntax
    const { data: sizeData, error: sizeError } = await supabase
      .from('media_items')
      .select('size_bytes.sum()')
      .single();

    if (sizeError) {
      console.error('Error getting total size:', sizeError);
      return { success: false, error: sizeError.message };
    }

    const totalSizeBytes = sizeData?.sum || 0;

    // Count non-ignored items using correct syntax
    let totalNonIgnoredCount = 0;
    let nonIgnoredQuery = supabase
      .from('media_items')
      .select('id.count()', { head: true });

    if (ignoreFilter) {
      nonIgnoredQuery = nonIgnoredQuery.not('extension', 'in', ignoreFilter);
    }

    const { data: nonIgnoredData, error: nonIgnoredError } =
      await nonIgnoredQuery.single();

    if (nonIgnoredError) {
      console.error('Error counting non-ignored items:', nonIgnoredError);
      return { success: false, error: nonIgnoredError.message };
    }

    totalNonIgnoredCount = nonIgnoredData?.count || 0;

    // Count processed items (excluding ignored items)
    let processedQuery = supabase
      .from('media_items')
      .select('id.count()', { head: true })
      .eq('processed', true);

    if (ignoreFilter) {
      processedQuery = processedQuery.not('extension', 'in', ignoreFilter);
    }

    const { data: processedData, error: processedError } =
      await processedQuery.single();

    if (processedError) {
      console.error('Error counting processed items:', processedError);
      return { success: false, error: processedError.message };
    }

    const processedCount = processedData?.count || 0;

    // Count organized items (excluding ignored items)
    let organizedQuery = supabase
      .from('media_items')
      .select('id.count()', { head: true })
      .eq('organized', true);

    if (ignoreFilter) {
      organizedQuery = organizedQuery.not('extension', 'in', ignoreFilter);
    }

    const { data: organizedData, error: organizedError } =
      await organizedQuery.single();

    if (organizedError) {
      console.error('Error counting organized items:', organizedError);
      return { success: false, error: organizedError.message };
    }

    const organizedCount = organizedData?.count || 0;

    // Count ignored items
    let ignoredCount = 0;
    if (ignoreFilter) {
      const ignoredQuery = supabase
        .from('media_items')
        .select('id.count()', { head: true })
        .filter('extension', 'in', ignoreFilter);

      const { data: ignoredData, error: ignoredError } =
        await ignoredQuery.single();

      if (ignoredError) {
        console.error('Error counting ignored items:', ignoredError);
        return { success: false, error: ignoredError.message };
      }

      ignoredCount = ignoredData?.count || 0;
    }

    // Get counts by extension
    const { data: extensionCounts, error: extensionError } = await supabase
      .from('media_items')
      .select('extension, count()');

    if (extensionError) {
      console.error('Error getting extension counts:', extensionError);
      return { success: false, error: extensionError.message };
    }

    // Process extension counts and build category counts simultaneously
    if (extensionCounts) {
      extensionCounts.forEach((item) => {
        const ext = item.extension.toLowerCase();
        itemsByExtension[ext] = item.count;

        // Map to category using our database-derived mapping
        const category = extensionToCategory[ext] || 'other';
        itemsByCategory[category] =
          (itemsByCategory[category] || 0) + item.count;
      });
    }

    const mediaStats: MediaStats = {
      totalMediaItems: totalNonIgnoredCount,
      totalSizeBytes,
      itemsByCategory,
      itemsByExtension,
      processedCount,
      unprocessedCount: totalNonIgnoredCount - processedCount,
      organizedCount,
      unorganizedCount: totalNonIgnoredCount - organizedCount,
      ignoredCount,
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

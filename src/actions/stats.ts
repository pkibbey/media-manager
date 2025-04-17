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

    // Get ignored file extensions first
    const { data: ignoredTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      ignoredTypes?.map((type) => type.extension.toLowerCase()) || [];

    // Initialize counters and data structures
    let totalSizeBytes = 0;
    const itemsByCategory: Record<string, number> = {};
    const itemsByExtension: Record<string, number> = {};
    let totalNonIgnoredCount = 0;
    let processedCount = 0;
    let unprocessedCount = 0;
    let organizedCount = 0;
    let unorganizedCount = 0;
    let ignoredCount = 0;

    // First, get the total count to know how many pages we need to fetch
    const { count: totalCount, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // Fetch items in batches of 1000 (Supabase limit)
    const pageSize = 1000;
    const pages = Math.ceil((totalCount || 0) / pageSize);

    for (let page = 0; page < pages; page++) {
      const { data: pageItems, error: pageError } = await supabase
        .from('media_items')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (pageError) {
        console.error(
          `Error fetching media items page ${page + 1}:`,
          pageError,
        );
        return { success: false, error: pageError.message };
      }

      if (!pageItems || pageItems.length === 0) continue;

      // Process each item in this page
      pageItems.forEach((item) => {
        // Add to total size
        totalSizeBytes += item.size_bytes || 0;

        // Extension stats
        const ext = item.extension.toLowerCase();
        itemsByExtension[ext] = (itemsByExtension[ext] || 0) + 1;

        // Category stats
        const typeMapping: Record<string, string[]> = {
          image: [
            'jpg',
            'jpeg',
            'png',
            'gif',
            'webp',
            'avif',
            'heic',
            'tiff',
            'raw',
            'bmp',
            'svg',
          ],
          video: [
            'mp4',
            'webm',
            'ogg',
            'mov',
            'avi',
            'wmv',
            'mkv',
            'flv',
            'm4v',
          ],
          data: ['json', 'xml', 'txt', 'csv', 'xmp'],
        };

        let category = 'other';
        Object.entries(typeMapping).forEach(([cat, extensions]) => {
          if (extensions.includes(ext)) {
            category = cat;
          }
        });

        itemsByCategory[category] = (itemsByCategory[category] || 0) + 1;

        // Check if this is an ignored file type
        const isIgnored = ignoredExtensions.includes(ext);

        if (isIgnored) {
          ignoredCount++;
        } else {
          // Only count non-ignored files for progress tracking
          totalNonIgnoredCount++;

          // Process and organization stats
          if (item.processed) {
            processedCount++;
          } else {
            unprocessedCount++;
          }

          if (item.organized) {
            organizedCount++;
          } else {
            unorganizedCount++;
          }
        }
      });
    }

    const mediaStats: MediaStats = {
      totalMediaItems: totalNonIgnoredCount,
      totalSizeBytes,
      itemsByCategory,
      itemsByExtension,
      processedCount,
      unprocessedCount,
      organizedCount,
      unorganizedCount,
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

'use server';

import { getFileTypeInfo } from '@/lib/file-types-utils'; // Import the new utility
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

    // Use the utility function to get file type info
    const fileTypeInfo = await getFileTypeInfo();

    if (!fileTypeInfo) {
      return { success: false, error: 'Failed to fetch file type information' };
    }

    const { ignoredExtensions, extensionToCategory } = fileTypeInfo;

    // Call the database function to get core statistics
    const { data: statsData, error: statsError } = await supabase.rpc(
      'get_media_statistics',
      {
        ignore_extensions: ignoredExtensions,
      },
    );

    if (statsError) {
      console.error('Error calling get_media_statistics:', statsError);
      return { success: false, error: statsError.message };
    }
    if (!statsData || statsData.length === 0) {
      console.error('No data returned from get_media_statistics');
      return { success: false, error: 'Failed to retrieve core statistics' };
    }

    // The function returns an array with one object
    const statsResult = statsData[0];

    // Call the database function to get extension statistics
    const { data: extensionResults, error: extensionError } =
      await supabase.rpc('get_extension_statistics', {
        ignore_extensions: ignoredExtensions,
      });

    if (extensionError) {
      console.error('Error calling get_extension_statistics:', extensionError);
      return { success: false, error: extensionError.message };
    }

    // Process extension counts and build category counts
    const itemsByCategory: Record<string, number> = {};
    const itemsByExtension: Record<string, number> = {};

    extensionResults?.forEach((item) => {
      const ext = item.extension.toLowerCase();
      const count = Number(item.count); // Ensure count is a number

      // Add to extension counts
      itemsByExtension[ext] = count;

      // Add to category counts using category from function result or fallback
      const category = item.category || extensionToCategory[ext] || 'other';
      itemsByCategory[category] = (itemsByCategory[category] || 0) + count;
    });

    // Count ignored items if relevant (Keep this separate as the function excludes them)
    let ignoredCount = 0;
    if (ignoredExtensions.length > 0) {
      const { count, error: ignoredError } = await supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .in('extension', ignoredExtensions);

      if (ignoredError) {
        console.error('Error counting ignored items:', ignoredError);
        // Decide if this error should halt the process or just log
      } else {
        ignoredCount = count || 0;
      }
    }

    // Count files needing timestamp correction using the processing_states table
    let needsTimestampCorrectionCount = 0;
    {
      const exifCompatibleExtensions = Object.entries(extensionToCategory)
        .filter(
          ([, category]) => category === 'image' || category === 'raw_image',
        )
        .map(([ext]) => ext); // Dynamically get EXIF compatible extensions based on category

      try {
        // First get media items with successful EXIF extraction
        const { data: successfulExif } = await supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'exif')
          .eq('status', 'success');

        // Get media items with error or outdated date correction
        const { data: failedDateCorrection } = await supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'dateCorrection')
          .eq('status', 'error');

        if (successfulExif?.length && failedDateCorrection?.length) {
          // Create Sets for efficient intersection
          const exifSuccessIds = new Set(
            successfulExif.map((item) => item.media_item_id),
          );
          const dateFailIds = new Set(
            failedDateCorrection.map((item) => item.media_item_id),
          );

          // Find IDs in both sets (items that need timestamp correction)
          const needsCorrectionIds = Array.from(exifSuccessIds)
            .filter((id) => dateFailIds.has(id))
            .filter((id) => id !== null) as string[];

          if (needsCorrectionIds.length > 0) {
            // Filter by extension if needed
            const { count } = await supabase
              .from('media_items')
              .select('*', { count: 'exact', head: true })
              .in('id', needsCorrectionIds)
              .in('extension', exifCompatibleExtensions)
              .not('extension', 'in', ignoredExtensions);

            needsTimestampCorrectionCount = count || 0;
          }
        }
      } catch (countError) {
        console.error('Error counting timestamp correction needs:', countError);
      }
    }

    const mediaStats: MediaStats = {
      totalMediaItems: statsResult.total_count,
      totalSizeBytes: Number(statsResult.total_size_bytes),
      itemsByCategory,
      itemsByExtension,
      // Use counts directly from the function result
      processedCount: statsResult.processed_count,
      unprocessedCount: statsResult.unprocessed_count,
      ignoredCount, // From the separate query
      needsTimestampCorrectionCount, // From the separate query
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

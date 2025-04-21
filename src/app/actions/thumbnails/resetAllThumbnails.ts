'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Reset all thumbnails by:
 * 1. Finding all media items with thumbnail processing states.
 * 2. Deleting the corresponding thumbnail files from storage.
 * 3. Clearing the thumbnail_path in the media_items table.
 * 4. Deleting the thumbnail processing states.
 */
export async function resetAllThumbnails(): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = createServerSupabaseClient();
  let deletedStorageCount = 0;
  let updatedPathsCount = 0;
  let deletedStatesCount = 0;

  try {
    // 1. Find all media items with thumbnail processing states (success, skipped, error, etc.)
    // Fetch in batches to handle potentially large numbers
    const BATCH_SIZE = 1000;
    let allMediaIds: string[] = [];
    let lastId = '0'; // Assuming media_item_id is string, adjust if numeric
    let hasMore = true;

    while (hasMore) {
      const { data: statesBatch, error: fetchError } = await supabase
        .from('processing_states')
        .select('media_item_id')
        .eq('type', 'thumbnail')
        .gt('media_item_id', lastId) // Paginate based on media_item_id
        .order('media_item_id')
        .limit(BATCH_SIZE);

      if (fetchError) {
        throw new Error(
          `Failed to fetch thumbnail states batch: ${fetchError.message}`,
        );
      }

      if (statesBatch && statesBatch.length > 0) {
        const batchIds = statesBatch
          .map((s) => s.media_item_id || '')
          .filter(Boolean);
        allMediaIds = allMediaIds.concat(batchIds);
        lastId = batchIds[batchIds.length - 1];
        hasMore = statesBatch.length === BATCH_SIZE;
      } else {
        hasMore = false;
      }
    }

    if (allMediaIds.length === 0) {
      return {
        success: true,
        message: 'No thumbnail processing states found to reset.',
      };
    }

    // Filter out any potential null IDs before proceeding
    const validMediaIds = allMediaIds.filter((id): id is string => id !== null);

    if (validMediaIds.length === 0) {
      // Still need to delete the processing states if they existed
      // (though theoretically, media_item_id shouldn't be null in processing_states)
      const { count: finalDeleteCount, error: finalDeleteError } =
        await supabase
          .from('processing_states')
          .delete({ count: 'exact' })
          .eq('type', 'thumbnail');
      if (finalDeleteError) {
        console.error(
          `[ResetThumbnails] Error deleting remaining processing states: ${finalDeleteError.message}`,
        );
      }
      return {
        success: true,
        message: `No valid media IDs found. Deleted ${finalDeleteCount} processing states.`,
      };
    }

    // 2. Delete corresponding thumbnail files from storage
    // Construct storage paths (assuming pattern mediaId_thumb.webp)
    const storagePaths = validMediaIds.map((id) => `${id}_thumb.webp`);

    // Delete from storage in batches (Supabase storage remove limit might be 100 or 1000)
    const STORAGE_BATCH_SIZE = 100;
    for (let i = 0; i < storagePaths.length; i += STORAGE_BATCH_SIZE) {
      const batch = storagePaths.slice(i, i + STORAGE_BATCH_SIZE);
      const { data: deletedFiles, error: storageError } = await supabase.storage
        .from('thumbnails')
        .remove(batch);

      if (storageError) {
        // Log error but continue to try deleting others and clearing DB states
        console.error(
          `[ResetThumbnails] Error deleting storage batch: ${storageError.message}`,
        );
      } else {
        deletedStorageCount += deletedFiles?.length || 0;
      }
    }

    // 3. Clear the thumbnail_path in the media_items table
    // Update in batches
    const DB_UPDATE_BATCH_SIZE = 500;
    for (let i = 0; i < validMediaIds.length; i += DB_UPDATE_BATCH_SIZE) {
      const batchIds = validMediaIds.slice(i, i + DB_UPDATE_BATCH_SIZE);
      const { count, error: updateError } = await supabase
        .from('media_items')
        .update({ thumbnail_path: null })
        .in('id', batchIds);

      if (updateError) {
        // Log error but continue
        console.error(
          `[ResetThumbnails] Error clearing thumbnail_path batch: ${updateError.message}`,
        );
      } else {
        updatedPathsCount += count || 0;
      }
    }

    // 4. Delete the thumbnail processing states
    // Delete in batches using the fetched IDs
    const DB_DELETE_BATCH_SIZE = 500;
    for (let i = 0; i < validMediaIds.length; i += DB_DELETE_BATCH_SIZE) {
      const batchIds = validMediaIds.slice(i, i + DB_DELETE_BATCH_SIZE);
      const { count, error: deleteError } = await supabase
        .from('processing_states')
        .delete({ count: 'exact' })
        .eq('type', 'thumbnail')
        .in('media_item_id', batchIds);

      if (deleteError) {
        // Log error but continue
        console.error(
          `[ResetThumbnails] Error deleting processing_states batch: ${deleteError.message}`,
        );
      } else {
        deletedStatesCount += count || 0;
      }
    }

    return {
      success: true,
      message: `Reset complete. Storage files deleted: ${deletedStorageCount}. Media paths cleared: ${updatedPathsCount}. Processing states deleted: ${deletedStatesCount}.`,
    };
  } catch (error: any) {
    console.error('[ResetThumbnails] Error during reset process:', error);
    return {
      success: false,
      message: `Failed to reset thumbnails: ${error.message}`,
    };
  }
}

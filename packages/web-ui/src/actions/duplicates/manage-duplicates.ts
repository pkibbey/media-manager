'use server';

import { createSupabase } from 'shared';
import type { DuplicatePair } from './get-duplicate-pairs';

/**
 * Mark a specific media item as deleted and remove all its duplicate relationships
 */
export async function markMediaAsDeleted(mediaId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();

    // Mark media as deleted
    const { error: updateError } = await supabase
      .from('media')
      .update({ is_deleted: true })
      .eq('id', mediaId);

    if (updateError) {
      throw updateError;
    }

    // Remove all duplicate entries involving this media
    const { error: deleteError } = await supabase
      .from('duplicates')
      .delete()
      .or(`media_id.eq.${mediaId},duplicate_id.eq.${mediaId}`);

    if (deleteError) {
      throw deleteError;
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error marking media as deleted:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove a specific duplicate relationship without deleting media
 */
export async function dismissDuplicate(
  mediaId: string,
  duplicateId: string,
): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();

    // Remove the specific duplicate relationship (both directions)
    const { error: deleteError } = await supabase
      .from('duplicates')
      .delete()
      .or(
        `and(media_id.eq.${mediaId},duplicate_id.eq.${duplicateId}),and(media_id.eq.${duplicateId},duplicate_id.eq.${mediaId})`,
      );

    if (deleteError) {
      throw deleteError;
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error dismissing duplicate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete all identical duplicate images based on strict criteria
 */
export async function deleteAllIdentical(): Promise<{
  success: boolean;
  processed: number;
  deleted: number;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();

    console.log('Starting deleteAllIdentical process...');

    // Get all duplicate pairs with media information
    const { data: duplicatePairs, error: fetchError } = await supabase
      .from('duplicates')
      .select(`
        *,
        media: media!media_id (*),
        duplicate_media: media!duplicate_id (*)
      `);

    if (fetchError) {
      throw fetchError;
    }

    if (!duplicatePairs || duplicatePairs.length === 0) {
      console.log('No duplicate pairs found');
      return {
        success: true,
        processed: 0,
        deleted: 0,
        error: null,
      };
    }

    let processedCount = 0;
    let deletedCount = 0;
    const mediaToDelete = new Set<string>();

    // First pass: identify all media items that should be deleted
    for (const pair of duplicatePairs) {
      processedCount++;

      // Skip if either media item is missing
      if (!pair.media || !pair.duplicate_media) {
        console.warn(
          `Skipping pair ${pair.media_id}-${pair.duplicate_id} - missing media data`,
        );
        continue;
      }

      const result = areIdentical(pair);

      // Check if they are identical
      if (result === true) {
        // Always delete the duplicate_media (second one) to maintain consistency
        mediaToDelete.add(pair.duplicate_id);
        console.log(
          `Marking for deletion: ${pair.duplicate_media.media_path} (duplicate of ${pair.media.media_path})`,
        );
      } else {
        console.log('result: ', result);
      }
    }

    console.log(`Found ${mediaToDelete.size} media items to delete`);

    // Second pass: perform the deletions
    for (const mediaId of mediaToDelete) {
      // Mark media as deleted
      const { error: updateError } = await supabase
        .from('media')
        .update({ is_deleted: true })
        .eq('id', mediaId);

      if (updateError) {
        console.error(
          `Error marking media ${mediaId} as deleted:`,
          updateError,
        );
        continue;
      }

      // Remove all duplicate entries involving this media
      const { error: deleteError } = await supabase
        .from('duplicates')
        .delete()
        .or(`media_id.eq.${mediaId},duplicate_id.eq.${mediaId}`);

      if (deleteError) {
        console.error(
          `Error removing duplicate entries for ${mediaId}:`,
          deleteError,
        );
        continue;
      }

      deletedCount++;
    }

    console.log(
      `Processed ${processedCount} duplicate pairs, deleted ${deletedCount} media items`,
    );

    return {
      success: true,
      processed: processedCount,
      deleted: deletedCount,
      error: null,
    };
  } catch (error) {
    console.error('Error in deleteAllIdentical:', error);
    return {
      success: false,
      processed: 0,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper function to extract file extension (case sensitive)
function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

// Helper function to check if two images are identical
function areIdentical(pair: DuplicatePair): string | boolean {
  // Check byte size
  if (pair.media.size_bytes !== pair.duplicate_media.size_bytes) {
    return 'size_bytes';
  }

  // Check file extensions (case sensitive)
  const mediaExt = getFileExtension(pair.media.media_path);
  const duplicateExt = getFileExtension(pair.duplicate_media.media_path);
  if (mediaExt !== duplicateExt) {
    return 'extension';
  }

  // Check dimensions
  const mediaWidth = pair.media.exif_data?.width;
  const mediaHeight = pair.media.exif_data?.height;
  const duplicateWidth = pair.duplicate_media.exif_data?.width;
  const duplicateHeight = pair.duplicate_media.exif_data?.height;

  if (mediaWidth !== duplicateWidth || mediaHeight !== duplicateHeight) {
    return 'dimensions';
  }

  // Check hamming distance (lower is more similar, 0-5 is very similar)
  if (pair.hamming_distance !== 0) {
    return 'hamming_distance';
  }

  // Check similarity score (higher is more similar, >= 0.95 is very similar)
  if (pair.similarity_score !== 1) {
    return 'similarity_score';
  }

  return true;
}

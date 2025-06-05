'use server';

import { createSupabase } from 'shared';

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

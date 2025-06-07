'use server';

import { createSupabase } from 'shared';

/**
 * Toggle the hidden status of multiple media items
 */
export async function toggleMediaHidden(mediaIds: string[]): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    if (mediaIds.length === 0) {
      return { success: true, error: null };
    }

    const supabase = createSupabase();

    // Get current status of the media items
    const { data: mediaItems, error: fetchError } = await supabase
      .from('media')
      .select('id, is_hidden')
      .in('id', mediaIds);

    if (fetchError) {
      throw fetchError;
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, error: null };
    }

    // Determine the new status - if any item is not hidden, hide all; otherwise unhide all
    const hasUnhiddenItems = mediaItems.some((item) => !item.is_hidden);
    const newHiddenStatus = hasUnhiddenItems;

    // Update all media items
    const { error: updateError } = await supabase
      .from('media')
      .update({ is_hidden: newHiddenStatus })
      .in('id', mediaIds);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error toggling media hidden status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Toggle the deleted status of multiple media items
 */
export async function toggleMediaDeleted(mediaIds: string[]): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    if (mediaIds.length === 0) {
      return { success: true, error: null };
    }

    const supabase = createSupabase();

    // Get current status of the media items
    const { data: mediaItems, error: fetchError } = await supabase
      .from('media')
      .select('id, is_deleted')
      .in('id', mediaIds);

    if (fetchError) {
      throw fetchError;
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, error: null };
    }

    // Determine the new status - if any item is not deleted, delete all; otherwise undelete all
    const hasUndeletedItems = mediaItems.some((item) => !item.is_deleted);
    const newDeletedStatus = hasUndeletedItems;

    // Update all media items
    const { error: updateError } = await supabase
      .from('media')
      .update({ is_deleted: newDeletedStatus })
      .in('id', mediaIds);

    if (updateError) {
      throw updateError;
    }

    // If marking as deleted, remove any duplicate relationships
    if (newDeletedStatus) {
      const { error: duplicatesError } = await supabase
        .from('duplicates')
        .delete()
        .or(
          mediaIds
            .map((id) => `media_id.eq.${id},duplicate_id.eq.${id}`)
            .join(','),
        );

      if (duplicatesError) {
        console.warn(
          'Error removing duplicate relationships:',
          duplicatesError,
        );
        // Don't fail the whole operation for this
      }
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error toggling media deleted status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

'use server';

import { createServerSupabaseClient } from "@/lib/supabase";


type UpdateVisibilityParams = {
  mediaId: string;
  isDeleted?: boolean;
  isHidden?: boolean;
};

/**
 * Updates the visibility status (deleted/hidden) for a media item
 */
export async function updateMediaVisibility({
  mediaId,
  isDeleted,
  isHidden,
}: UpdateVisibilityParams) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Call the update_media_visibility function
    const { error } = await supabase.rpc('update_media_visibility', {
      p_media_id: mediaId,
      p_is_deleted: isDeleted,
      p_is_hidden: isHidden,
    });

    if (error) {
      console.error('Error updating media visibility:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating media visibility:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error occurred') 
    };
  }
}
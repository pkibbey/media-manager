'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Delete all media items from the database
 * @returns Delete operation result
 */
export async function deleteAllMediaItems(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    // Delete all media items
    const { error: deleteError, count } = await supabase
      .from('media_items')
      .delete({ count: 'exact' })
      .not('id', 'is', null);

    if (deleteError) {
      console.error('Error deleting media items:', deleteError);
      return { success: false, error: deleteError.message };
    }

    return {
      success: true,
      count: count || 0,
    };
  } catch (error: any) {
    console.error('Error deleting media items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

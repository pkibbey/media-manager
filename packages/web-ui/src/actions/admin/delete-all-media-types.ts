'use server';

import { createSupabase } from 'shared/supabase';

/**
 * Delete all media types
 * Note: This will fail if there are media items using any of the types
 */
export async function deleteAllMediaTypes(): Promise<{
  success: boolean;
  error?: unknown;
  message?: string;
}> {
  try {
    const supabase = createSupabase();
    const { error } = await supabase
      .from('media_types')
      .delete()
      .not('id', 'is', null);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'All media types have been successfully deleted.',
    };
  } catch (error) {
    console.error('Error deleting all media types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

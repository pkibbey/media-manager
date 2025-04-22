'use server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Reset the processing state of all media items
 * This will mark all items as unprocessed so they can be re-processed
 */
export async function resetEverything(): Promise<{
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
      console.error('RESET: Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // First, delete all media items
    const { error: deleteMediaError } = await supabase
      .from('media_items')
      .delete()
      .filter('id', 'not.is', null);

    if (deleteMediaError) {
      console.error('Error updating media items:', deleteMediaError);
      return { success: false, error: deleteMediaError.message };
    }

    // Delete all processing states
    const { error: deleteError } = await supabase
      .from('processing_states')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('Error resetting processing states:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Then delete all file types
    const { error: deleteFileTypesError } = await supabase
      .from('file_types')
      .delete()
      .neq('id', 0); // Delete all file types

    if (deleteFileTypesError) {
      console.error('Error deleting file types:', deleteFileTypesError);
      return { success: false, error: deleteFileTypesError.message };
    }

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

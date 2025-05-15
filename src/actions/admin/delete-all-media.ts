'use server';

import { createSupabase } from '@/lib/supabase';

export async function deleteAllMediaItems(): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  const supabase = createSupabase();
  try {
    // Delete all rows from the media_items table.
    // Using .delete().not('id', 'is', null) targets all rows with a primary key.
    const { error: deleteError } = await supabase
      .from('media')
      .delete()
      .not('id', 'is', null);

    if (deleteError) {
      console.error('Error deleting media items:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Revalidate paths to ensure UI reflects the changes
    // revalidatePath('/admin/scan');
    // revalidatePath('/admin');

    return {
      success: true,
      message: 'All media items have been successfully deleted.',
    };
  } catch (err) {
    console.error('Unexpected error during media items deletion:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unknown error occurred',
    };
  }
}

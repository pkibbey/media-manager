'use server';

import { createSupabase } from '@/lib/supabase';

export async function deleteAllMediaItems(): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  const supabase = createSupabase();
  try {
    const { error: deleteError } = await supabase
      .from('media')
      .delete()
      .not('id', 'is', null);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return {
      success: true,
      message: 'All media items have been successfully deleted.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unknown error occurred',
    };
  }
}

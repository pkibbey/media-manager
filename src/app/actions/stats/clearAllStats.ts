'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Clear all media items from database
 */
export async function clearAllStats(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  // Delete all processing_states from the database
  const { error: deleteError, count } = await supabase
    .from('processing_states')
    .delete()
    .eq('type', 'exif');
  if (deleteError) throw deleteError;

  return {
    success: true,
    message: `Successfully removed ${count} media items from the database.`,
  };
}

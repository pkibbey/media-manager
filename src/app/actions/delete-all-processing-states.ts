'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Delete all processing states from the database
 * @returns Delete operation result
 */
export async function deleteAllProcessingStates(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase
      .from('processing_states')
      .delete()
      .neq('id', 0);

    if (error) {
      console.error('Error deleting processing states:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting processing states:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

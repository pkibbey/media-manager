'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Delete all file types from the database
 * @returns Delete operation result
 */
export async function deleteAllFileTypes(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase.from('file_types').delete().neq('id', 0);

    if (error) {
      console.error('Error deleting file types:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting file types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

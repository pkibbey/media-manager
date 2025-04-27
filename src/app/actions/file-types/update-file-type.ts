'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { FileType } from '@/types/db-types';

/**
 * Update a file type
 * @param id File type ID
 * @param updates Object containing fields to update
 * @returns Update result
 */
export async function updateFileType(
  id: number,
  updates: Partial<FileType>,
): Promise<{
  success: boolean;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase
      .from('file_types')
      .update(updates)
      .eq('id', id);

    return {
      success: !error,
      error,
    };
  } catch (error) {
    console.error(`Error updating file type ${id}:`, error);
    return {
      success: false,
      error,
    };
  }
}

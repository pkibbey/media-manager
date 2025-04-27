'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Get file type by extension
 * @param extension File extension
 * @returns Query result with file type ID
 */
export async function getFileTypeIdByExtension(extension: string): Promise<{
  data: { id: number } | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('file_types')
    .select('id')
    .eq('extension', extension)
    .single();
}

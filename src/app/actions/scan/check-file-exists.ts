'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Check if a file exists in the database
 * @param filePath Path to the file to check
 * @returns Query result with file data if it exists
 */
export async function checkFileExists(filePath: string): Promise<{
  data: { id: string; modified_date: string; size_bytes: number } | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('media_items')
    .select('id, modified_date, size_bytes')
    .eq('file_path', filePath)
    .maybeSingle();
}

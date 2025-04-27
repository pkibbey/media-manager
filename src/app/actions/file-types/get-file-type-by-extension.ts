'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { FileType } from '@/types/db-types';

/**
 * Get a file type by extension
 * @param extension File extension (without the dot)
 * @returns Query result with file type data
 */
export async function getFileTypeByExtension(extension: string): Promise<{
  data: FileType | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('file_types')
    .select('*')
    .eq('extension', extension.toLowerCase())
    .single();
}

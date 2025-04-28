'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Add or update a file type
 * @param extension File extension
 * @param category File category
 * @param mimeType File MIME type
 * @returns Query result with the new file type ID and success status
 */
export async function upsertFileType(
  extension: string,
  category: string,
  mimeType: string,
): Action<{ id: number }> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('file_types')
    .upsert(
      {
        extension,
        category,
        mime_type: mimeType,
      },
      {
        onConflict: 'extension',
        ignoreDuplicates: false,
      },
    )
    .select('id')
    .single();
}

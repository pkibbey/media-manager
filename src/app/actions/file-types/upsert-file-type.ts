'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Add or update a file type
 * @param extension File extension
 * @param category File category
 * @param mimeType File MIME type
 * @returns Query result with the new file type ID
 */
export async function upsertFileType(
  extension: string,
  category: string,
  mimeType: string,
): Promise<{
  data: { id: number } | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  const result = await supabase
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

  return result;
}

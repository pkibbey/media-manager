'use server';

import { createSupabase } from '@/lib/supabase';
import type { FileDetails } from '@/types/scan-types';
import type { TablesInsert } from '@/types/supabase';

/**
 * Add a single file to the database
 * Uses upsert for efficiency, but does not update if already exists
 */
export async function addFileToDatabase(
  file: FileDetails,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabase();

    const media: TablesInsert<'media'> = {
      media_path: file.path,
      media_type_id: file.mediaType.id,
      size_bytes: file.size,
    };

    const { error: upsertError } = await supabase
      .from('media')
      .upsert(media, { onConflict: 'media_path', ignoreDuplicates: true });

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

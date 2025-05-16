import { v4 } from 'uuid';
import { createSupabase } from '@/lib/supabase';
import type { FileDetails } from '@/types/scan-types';

/**
 * Add a single file to the database
 */
export async function addFileToDatabase(
  file: FileDetails,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabase();

    // Check if the file already exists (by relative path)
    const { data: existingFile } = await supabase
      .from('media')
      .select('id')
      .eq('media_path', file.path)
      .limit(1)
      .single();

    if (existingFile) {
      return { success: false, error: 'File already exists in database' };
    }

    // Add the file to the database
    const fileId = v4();
    const { error } = await supabase.from('media').insert({
      id: fileId,
      media_path: file.path, // Store the relative path
      media_type_id: file.mediaType.id,
      size_bytes: file.size,
      created_date: file.lastModified
        ? new Date(file.lastModified).toISOString()
        : new Date().toISOString(),
      is_hidden: false,
      is_deleted: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

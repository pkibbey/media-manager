'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Update the last scanned timestamp for a folder
 * @param folderId Folder ID
 * @returns Query result
 */
export async function updateFolderLastScanned(folderId: number): Promise<{
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  const result = await supabase
    .from('scan_folders')
    .update({ last_scanned: new Date().toISOString() })
    .eq('id', folderId);

  return result;
}

'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Update the last scanned timestamp for a folder
 * @param folderId Folder ID
 * @returns Query result
 */
export async function updateFolderLastScanned(folderId: number): Action<null> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('scan_folders')
    .update({ last_scanned: new Date().toISOString() })
    .eq('id', folderId);
}

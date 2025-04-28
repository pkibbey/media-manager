'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Remove a scan folder from the database
 * @param folderId ID of the scan folder to remove
 * @returns Operation result
 */
export async function removeScanFolder(folderId: number): Action<null> {
  const supabase = createServerSupabaseClient();

  return await supabase.from('scan_folders').delete().eq('id', folderId);
}

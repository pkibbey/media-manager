'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Update the scan status of a folder
 * @param folderId ID of the folder to update
 * @param resetStatus If true, sets last_scanned to null to mark folder for rescanning
 * @returns Operation result
 */
export async function updateFolderScanStatus(
  folderId: number,
  resetStatus: boolean,
): Action<null> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('scan_folders')
    .update({
      last_scanned: resetStatus ? null : new Date().toISOString(),
    })
    .eq('id', folderId);
}

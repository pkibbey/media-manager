'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Update the scan status of a folder
 * @param folderId ID of the folder to update
 * @param resetStatus If true, sets last_scanned to null to mark folder for rescanning
 * @returns Operation result
 */
export async function updateFolderScanStatus(
  folderId: number,
  resetStatus: boolean,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase
      .from('scan_folders')
      .update({
        last_scanned: resetStatus ? null : new Date().toISOString(),
      })
      .eq('id', folderId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

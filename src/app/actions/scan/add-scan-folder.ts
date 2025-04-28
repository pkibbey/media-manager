'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, ScanFolder } from '@/types/db-types';

/**
 * Add a new folder to scan
 * @param folderPath Path to the folder to scan
 * @param includeSubfolders Whether to include subfolders in the scan
 * @returns Operation result with new folder data
 */
export async function addScanFolder(
  folderPath: string,
  includeSubfolders: boolean,
): Action<ScanFolder> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('scan_folders')
    .insert({
      path: folderPath,
      include_subfolders: includeSubfolders,
    })
    .select()
    .single();
}

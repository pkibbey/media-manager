'use server';

=import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Add a new scan folder to the database
 * @param folderPath Path to the folder to scan
 * @param includeSubfolders Whether to include subfolders in the scan
 * @returns Operation result with created folder data
 */
export async function addScanFolder(
  folderPath: string,
  includeSubfolders = true,
): Promise<{
  data: any | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  const result = await supabase
    .from('scan_folders')
    .insert({
      path: folderPath,
      include_subfolders: includeSubfolders,
    })
    .select()
    .single();


  return result;
}

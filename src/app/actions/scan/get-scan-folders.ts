'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Get all scan folders from the database
 * @returns Query result with scan folders data
 */
export async function getScanFolders(): Promise<{
  data: any[] | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return await supabase.from('scan_folders').select('*').order('path');
}

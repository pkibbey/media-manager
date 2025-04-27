'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Get folders to scan from the database
 * @param folderId Optional specific folder ID to retrieve
 * @returns Query result with scan folders data
 */
export async function getFoldersToScan(folderId?: number): Promise<{
  data: any[] | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return folderId
    ? supabase.from('scan_folders').select('*').eq('id', folderId).order('path')
    : supabase.from('scan_folders').select('*').order('path');
}

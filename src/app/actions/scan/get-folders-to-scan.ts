'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, ScanFolder } from '@/types/db-types';

/**
 * Get folders to scan from the database
 * @param folderId Optional specific folder ID to retrieve
 * @returns Query result with scan folders data
 */
export async function getFoldersToScan(
  folderId?: number,
): Action<ScanFolder[]> {
  const supabase = createServerSupabaseClient();

  const query = folderId
    ? supabase.from('scan_folders').select('*').eq('id', folderId).order('path')
    : supabase.from('scan_folders').select('*').order('path');

  return await query;
}

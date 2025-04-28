'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, ScanFolder } from '@/types/db-types';

/**
 * Get all scan folders from the database
 * @returns Query result with scan folders data and success status
 */
export async function getScanFolders(): Action<ScanFolder[]> {
  const supabase = createServerSupabaseClient();

  return await supabase.from('scan_folders').select('*').order('path');
}

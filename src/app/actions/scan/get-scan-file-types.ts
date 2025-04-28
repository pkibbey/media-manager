'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, FileType } from '@/types/db-types';

/**
 * Get all file types for scanning
 * @returns Query result with file types data (extension and category)
 */
export async function getScanFileTypes(): Promise<
  Action<Pick<FileType, 'id' | 'category' | 'extension'>[]>
> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('file_types')
    .select('id, category, extension')
    .eq('scan', true);
}

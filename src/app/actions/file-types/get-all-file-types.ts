'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, FileType } from '@/types/db-types';

/**
 * Get all file types with optional filtering
 * @returns Query result with file types data
 */
export async function getAllFileTypes(): Action<FileType[]> {
  const supabase = createServerSupabaseClient();

  // Apply filters
  let query = supabase.from('file_types').select('*');

  // Always sort by extension for consistent results
  query = query.order('extension');

  return await query;
}

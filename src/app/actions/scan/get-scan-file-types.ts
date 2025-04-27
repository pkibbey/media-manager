'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Get all file types for scanning
 * @returns Query result with file types data (extension and category)
 */
export async function getScanFileTypes(): Promise<{
  data: { id: string; category: string }[] | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase.from('file_types').select('id, category');
}

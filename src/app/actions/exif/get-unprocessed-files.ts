'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Helper function to get unprocessed files with a limit
 * Uses the dedicated SQL function for consistent results
 * @param limit Maximum number of files to retrieve
 * @returns Query result with unprocessed media files
 */
export async function getUnprocessedFiles({ limit }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  // Use the dedicated SQL function to fetch unprocessed files
  return await supabase.rpc('get_unprocessed_exif_files', {
    limit_count: limit,
  });
}

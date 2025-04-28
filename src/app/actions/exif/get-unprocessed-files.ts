'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Helper function to get unprocessed files with a limit
 * @param limit Maximum number of files to retrieve
 * @returns Query result with unprocessed media files
 */
export async function getUnprocessedFiles({ limit }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('media_items')
    .select(
      "*, processing_states(*), file_types(*)",
      {
        count: 'exact',
      },
    )
    // Only get image files that aren't ignored
    .eq('file_types.category', 'image')
    .is('file_types.ignore', false)
    .is('processing_states', null)
    .limit(limit);
}

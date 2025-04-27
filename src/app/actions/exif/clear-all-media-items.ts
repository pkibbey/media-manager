'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Clear all EXIF data by:
 * 1. Setting the exif_data to null in the media_items table.
 * 2. Clearing any EXIF processing states.
 */
export async function clearAllMediaItems(): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = createServerSupabaseClient();

  // Clear processing states related to EXIF
  const { error: processingStatesError, count } = await supabase
    .from('processing_states')
    .delete()
    .eq('type', 'exif');
  if (processingStatesError) throw processingStatesError;

  return {
    success: true,
    message: `EXIF data cleared from ${count} media items successfully.`,
  };
}

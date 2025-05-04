'use server';

import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Clear EXIF data from all media items
 * @returns Result with number of affected rows and status message
 */
export async function clearAllExifData(): Promise<
  PostgrestSingleResponse<
    {
      affected_rows: number;
      status: string;
    }[]
  >
> {
  const supabase = createServerSupabaseClient();

  // Call the RPC function to clear all EXIF data
  return await supabase.rpc('clear_all_exif_data');
}

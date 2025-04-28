'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Clear all media items from database
 */
export async function clearAllStats(): Action<null> {
  const supabase = createServerSupabaseClient();

  // Delete all processing_states from the database
  return await supabase.from('processing_states').delete().eq('type', 'exif');
}

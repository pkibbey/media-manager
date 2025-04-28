'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Delete all processing states from the database
 * @returns Delete operation result
 */
export async function deleteAllProcessingStates(): Action<null> {
  const supabase = createServerSupabaseClient();

  return await supabase.from('processing_states').delete().neq('id', 0);
}

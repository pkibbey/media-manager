'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, ProcessingState } from '@/types/db-types';

/**
 * Get all failing processing states
 * @param progressType Optional type filter
 * @param limit Maximum number of items to retrieve
 * @returns Query result with failing processing states
 */
export async function getFailingProcessingStates(
  progressType?: string,
  limit = 50,
): Action<ProcessingState[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('processing_states')
    .select('*, media_items(*)')
    .eq('status', 'failure');

  if (progressType) {
    query = query.eq('type', progressType);
  }

  return await query.order('updated_at', { ascending: false }).limit(limit);
}

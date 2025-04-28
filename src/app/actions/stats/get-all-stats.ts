'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';
import type { AllMediaStats } from '@/types/media-types';

/**
 * Get comprehensive statistics about all items in the system
 */
export async function getAllStats(): Action<AllMediaStats> {
  const supabase = createServerSupabaseClient();

  // Get total count of media items
  const { count: totalCount, error: totalError } = await supabase
    .from('media_items')
    .select('id', { count: 'exact', head: true });

  // Get total size of all media
  const { data: sizeData, error: sizeError } = await supabase
    .rpc('sum_file_sizes')
    .single();

  // Get error total count
  const { count: failureCount, error: erroredError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.status', 'failed');

  return {
    error: totalError || sizeError || erroredError,
    data: {
      totalCount: totalCount || 0,
      failureCount: failureCount || 0,
      totalSizeBytes: sizeData?.sum || 0,
    },
  };
}

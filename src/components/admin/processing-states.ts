'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem, ProcessingState } from '@/types/db-types';

export type ProcessingStateWithMedia = ProcessingState & {
  media_item?: MediaItem;
};

export type ProcessingStatesResponse = {
  success: boolean;
  data?: ProcessingStateWithMedia[];
  error?: string;
  counts?: {
    failure: number;
    processing: number;
    success: number;
    total: number;
  };
};

/**
 * Get processing states with optional filtering
 */
export async function getProcessingStates({
  status,
  type,
  limit = 100,
  offset = 0,
}: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<ProcessingStatesResponse> {
  try {
    const supabase = createServerSupabaseClient();

    // Build our query for processing states
    let query = supabase
      .from('processing_states')
      .select('*, media_item:media_items(*)', { count: 'exact' });

    // Add filters if provided
    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // Get processing states with pagination
    const { data, error } = await query
      .order('processed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return {
        success: false,
        error: `Failed to fetch processing states: ${error.message}`,
      };
    }

    // Get counts for each status type for summary stats
    const counts = await getProcessingStateCounts();

    return {
      success: true,
      data: data as ProcessingStateWithMedia[],
      counts,
    };
  } catch (error) {
    console.error('Error fetching processing states:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get counts for each processing state status
 */
async function getProcessingStateCounts() {
  const supabase = createServerSupabaseClient();

  // Get counts for failure states
  const { count: failureCount } = await supabase
    .from('processing_states')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failure');

  // Get counts for processing states (null status)
  const { count: processingCount } = await supabase
    .from('processing_states')
    .select('*', { count: 'exact', head: true })
    .is('status', null);

  // Get counts for success states
  const { count: successCount } = await supabase
    .from('processing_states')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success');

  // Get total count
  const { count: totalCount } = await supabase
    .from('processing_states')
    .select('*', { count: 'exact', head: true });

  return {
    failure: failureCount || 0,
    processing: processingCount || 0,
    success: successCount || 0,
    total: totalCount || 0,
  };
}

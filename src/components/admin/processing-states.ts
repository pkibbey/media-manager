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
    error: number;
    aborted: number;
    skipped: number;
    failed: number;
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

  // Get counts for error states
  const { count: errorCount } = await supabase
    .from('processing_states')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'error');

  // Get counts for aborted states
  const { count: abortedCount } = await supabase
    .from('processing_states')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'aborted');

  // Get counts for skipped states
  const { count: skippedCount } = await supabase
    .from('processing_states')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'skipped');

  // Get counts for failed states
  const { count: failedCount } = await supabase
    .from('processing_states')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  // Get counts for processing states
  const { count: processingCount } = await supabase
    .from('processing_states')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'processing');

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
    error: errorCount || 0,
    aborted: abortedCount || 0,
    skipped: skippedCount || 0,
    failed: failedCount || 0,
    processing: processingCount || 0,
    success: successCount || 0,
    total: totalCount || 0,
  };
}

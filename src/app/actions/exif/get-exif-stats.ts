'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';
import type { UnifiedStats } from '@/types/unified-stats';

/**
 * Get EXIF processing statistics using Supabase JS queries.
 */
export async function getExifStats(): Action<UnifiedStats> {
  const supabase = createServerSupabaseClient();

  // Call the RPC function instead of making multiple separate queries
  const { data, error } = await supabase.rpc('get_exif_stats');

  // Check for any errors in the query
  if (error || !data || data.length === 0) {
    return {
      data: {
        status: 'failure',
        message: `Failed to fetch thumbnail stats: ${error?.message || 'No data returned'}`,
        counts: {
          total: 0,
          success: 0,
          failed: 0,
        },
      },
      error,
      count: null,
    };
  }
  // Extract stats from the first row of data returned by the function
  const stats = data[0];
  const counts = {
    total: stats.total || 0,
    success: stats.success || 0,
    failed: stats.failed || 0,
  };

  return {
    data: {
      status: 'success',
      message: `${counts.success} of ${counts.total} images have EXIF data`,
      counts,
    },
    error: null,
    count: counts.total,
  };
}

'use server';

import { includeMedia } from '@/lib/media-filters';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  calculatePercentages,
  type StatsResponse,
  type UnifiedStats,
} from '@/types/unified-stats';

/**
 * Get statistics about thumbnail status
 * Uses the new UnifiedStats structure
 */
export async function getThumbnailStats(): Promise<
  StatsResponse<UnifiedStats>
> {
  const supabase = createServerSupabaseClient();

  // Get total count of all compatible image files, excluding ignored file types
  const { count: totalCount, error: totalError } = await includeMedia(
    supabase
      .from('media_items')
      .select('*, file_types!inner(*)', { count: 'exact', head: true }),
  );
  if (totalError) throw totalError;

  // Get count of files with successful thumbnails
  const { count: successCount, error: successError } = await includeMedia(
    supabase
      .from('media_items')
      .select('*, file_types!inner(*), processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .eq('processing_states.type', 'thumbnail')
      .eq('processing_states.status', 'success'),
  );
  if (successError) throw successError;

  // Get count of files skipped due to being large
  const { count: skippedCount, error: skippedError } = await includeMedia(
    supabase
      .from('media_items')
      .select('*, file_types!inner(*), processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .eq('processing_states.type', 'thumbnail')
      .eq('processing_states.status', 'skipped'),
  );
  if (skippedError) throw skippedError;

  // Get count of files with errors
  const { count: erroredCount, error: erroredError } = await includeMedia(
    supabase
      .from('media_items')
      .select('*, file_types!inner(*), processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .eq('processing_states.type', 'thumbnail')
      .eq('processing_states.status', 'error'),
  );
  if (erroredError) throw erroredError;

  // Get ignored files count - this specifically counts files with ignored file types
  const { count: ignoredCount, error: ignoredError } = await includeMedia(
    supabase
      .from('media_items')
      .select('id, file_types!inner(*)', { count: 'exact', head: true })
      .eq('file_types.ignore', true),
  );
  if (ignoredError) throw ignoredError;

  // Create counts for unified format
  const counts = {
    total: totalCount || 0,
    success: successCount || 0,
    failed: erroredCount || 0,
    skipped: skippedCount || 0,
    ignored: ignoredCount || 0,
  };

  // New unified stats format
  const unifiedStats: UnifiedStats = {
    status: 'success',
    message: `${counts.success} of ${counts.total} files have thumbnails`,
    counts,
    percentages: calculatePercentages(counts),
  };

  return {
    success: true,
    data: unifiedStats,
  };
}

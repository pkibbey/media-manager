'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { calculatePercentages } from '@/lib/utils';
import type { UnifiedStats } from '@/types/unified-stats';

/**
 * Get statistics about thumbnail status
 * Uses the new UnifiedStats structure
 */
export async function getThumbnailStats(): Promise<UnifiedStats> {
  const supabase = createServerSupabaseClient();

  // Get total count of all compatible image files, excluding ignored file types
  const { count: totalCount, error: totalError } = await supabase
    .from('media_items')
    .select('*, file_types!inner(*)', { count: 'exact', head: true })
    .in('file_types.category', ['image'])
    .eq('file_types.ignore', false);

  if (totalError) throw totalError;

  // Get count of files with successful thumbnails
  const { count: successCount, error: successError } = await supabase
    .from('media_items')
    .select('*, file_types!inner(*), processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .in('file_types.category', ['image'])
    .eq('file_types.ignore', false)
    .eq('processing_states.type', 'thumbnail')
    .eq('processing_states.status', 'success');

  if (successError) throw successError;

  // Get count of files with errors
  const { count: failureCount, error: failureError } = await supabase
    .from('media_items')
    .select('*, file_types!inner(*), processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .in('file_types.category', ['image'])
    .eq('file_types.ignore', false)
    .eq('processing_states.type', 'thumbnail')
    .eq('processing_states.status', 'failure');

  if (failureError) throw failureError;

  // Create counts for unified format
  const counts = {
    total: totalCount || 0,
    success: successCount || 0,
    failed: failureCount || 0,
  };

  return {
    status: 'success',
    message: `${counts.success} of ${counts.total} files have thumbnails`,
    counts,
    percentages: calculatePercentages(counts),
  };
}

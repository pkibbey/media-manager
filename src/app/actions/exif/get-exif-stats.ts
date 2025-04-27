'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { calculatePercentages } from '@/lib/utils';
import type { UnifiedStats } from '@/types/unified-stats';

/**
 * Get EXIF processing statistics using Supabase JS queries.
 */
export async function getExifStats(): Promise<UnifiedStats> {
  const supabase = createServerSupabaseClient();

  const { error: allMediaItemsError, count: allMediaItemsCount } =
    await supabase
      .from('media_items')
      .select('id, file_types(*)', { count: 'exact', head: true })
      .eq('file_types.category', 'image')
      .is('file_types.ignore', false);
  if (allMediaItemsError) throw allMediaItemsError;

  const { error: successError, count: successCount } = await supabase
    .from('media_items')
    .select('id, file_types(*), processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.status', 'success')
    .eq('file_types.category', 'image')
    .is('file_types.ignore', false);
  if (successError) throw successError;

  const { error: failedError, count: failedCount } = await supabase
    .from('media_items')
    .select('id, file_types(*), processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.status', 'failure')
    .eq('file_types.category', 'image')
    .is('file_types.ignore', false);
  if (failedError) throw failedError;

  const counts = {
    total: allMediaItemsCount || 0,
    success: successCount || 0,
    failed: failedCount || 0,
  };

  const unifiedStats: UnifiedStats = {
    status: 'success',
    message: `${counts.success} of ${counts.total} images have EXIF data`,
    counts,
    percentages: calculatePercentages(counts),
  };

  return unifiedStats;
}

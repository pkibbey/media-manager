'use server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { calculatePercentages } from '@/lib/utils';
import type { StatsResponse, UnifiedStats } from '@/types/unified-stats';

/**
 * Get comprehensive statistics about media items in the system
 */
export async function getMediaStats(): Promise<StatsResponse<UnifiedStats>> {
  const supabase = createServerSupabaseClient();

  // Get total count of media items
  const { count: totalCount, error: totalError } = await supabase
    .from('media_items')
    .select('id, file_types!inner(*)', { count: 'exact', head: true })
    .in('file_types.category', ['image', 'video'])
    .eq('file_types.ignore', false);
  if (totalError) throw totalError;

  // Get exif processing success count
  const { count: processedCount, error: processedError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*), file_types!inner(*)', {
      count: 'exact',
      // head: true,
    })
    .in('file_types.category', ['image', 'video'])
    .eq('file_types.ignore', false)
    .eq('processing_states.type', 'exif')
    .eq('processing_states.status', 'success');
  if (processedError) throw processedError;

  // Get exif processing error count
  const { count: erroredCount, error: erroredError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*), file_types!inner(*)', {
      count: 'exact',
      head: true,
    })
    .in('file_types.category', ['image', 'video'])
    .eq('file_types.ignore', false)
    .eq('processing_states.type', 'exif')
    .eq('processing_states.status', 'error');
  if (erroredError) throw erroredError;

  // Get exif processing skipped count
  const { count: skippedCount, error: skippedError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*), file_types!inner(*)', {
      count: 'exact',
      head: true,
    })
    .in('file_types.category', ['image', 'video'])
    .eq('file_types.ignore', false)
    .eq('processing_states.type', 'exif')
    .eq('processing_states.status', 'skipped');
  if (skippedError) throw skippedError;

  // Get ignored files count - this specifically counts files with ignored file types
  const { count: ignoredCount, error: ignoredError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*), file_types!inner(*)', {
      count: 'exact',
      head: true,
    })
    .in('file_types.category', ['image', 'video'])
    .eq('file_types.ignore', false)
    .eq('file_types.ignore', true);
  if (ignoredError) throw ignoredError;

  // Create counts for new unified format
  const counts = {
    total: totalCount || 0,
    success: processedCount || 0,
    failed: erroredCount || 0,
    skipped: skippedCount || 0,
    ignored: ignoredCount || 0,
  };

  const unifiedStats: UnifiedStats = {
    status: 'success',
    message: `${counts.success} of ${counts.total} files processed`,
    counts,
    percentages: calculatePercentages(counts),
  };

  return {
    success: true,
    data: unifiedStats,
  };
}

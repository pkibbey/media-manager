'use server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { calculatePercentages } from '@/lib/utils';
import type { UnifiedStats } from '@/types/unified-stats';

/**
 * Get comprehensive statistics about media items in the system
 */
export async function getMediaStats(): Promise<UnifiedStats> {
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
  const { count: failureCount, error: erroredError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*), file_types!inner(*)', {
      count: 'exact',
      head: true,
    })
    .in('file_types.category', ['image', 'video'])
    .eq('file_types.ignore', false)
    .eq('processing_states.type', 'exif')
    .eq('processing_states.status', 'failure');
  if (erroredError) throw erroredError;

  // Create counts for new unified format
  const counts = {
    total: totalCount || 0,
    success: processedCount || 0,
    failed: failureCount || 0,
  };

  return {
    status: 'success',
    message: `${counts.success} of ${counts.total} files processed`,
    counts,
    percentages: calculatePercentages(counts),
  };
}

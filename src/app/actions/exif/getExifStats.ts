'use server';

import { includeMedia } from '@/lib/media-filters';
import { createServerSupabaseClient } from '@/lib/supabase';
import { calculatePercentages } from '@/lib/utils';
import type { UnifiedStats } from '@/types/unified-stats';

/**
 * Get EXIF processing statistics
 * This implementation uses the new UnifiedStats format while maintaining backward compatibility
 * with the old ExifStatsResult format
 */
export async function getExifStats(): Promise<UnifiedStats> {
  const supabase = createServerSupabaseClient();

  // Get total count of all media items (eligible for EXIF processing)
  // We're not using processing_states here because we want to count ALL files
  const { count: totalImageCount, error: totalError } = await includeMedia(
    supabase.from('media_items').select('id, file_types!inner(*)', {
      count: 'exact',
      head: true,
    }),
  );

  if (totalError) throw totalError;

  // Count successful EXIF processed items
  const { count: successCount, error: successError } = await includeMedia(
    supabase
      .from('media_items')
      .select('id, file_types!inner(*), processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .eq('processing_states.type', 'exif')
      .eq('processing_states.status', 'success'),
  );

  if (successError) throw successError;

  // Count error EXIF processed items
  const { count: errorCount, error: errorCountError } = await includeMedia(
    supabase
      .from('media_items')
      .select('id, file_types!inner(*), processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .eq('processing_states.type', 'exif')
      .eq('processing_states.status', 'error'),
  );

  if (errorCountError) throw errorCountError;

  // Count skipped EXIF processed items
  const { count: skippedCount, error: skippedError } = await includeMedia(
    supabase
      .from('media_items')
      .select('id, file_types!inner(*), processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .eq('processing_states.type', 'exif')
      .eq('processing_states.status', 'skipped'),
  );

  if (skippedError) throw skippedError;

  // Create counts for new unified format
  const counts = {
    total: totalImageCount || 0,
    success: successCount || 0,
    failed: errorCount || 0,
    skipped: skippedCount || 0,
  };

  const unifiedStats: UnifiedStats = {
    status: 'success',
    message: `${counts.success} of ${counts.total} files have EXIF data`,
    counts,
    percentages: calculatePercentages(counts),
  };

  return unifiedStats;
}

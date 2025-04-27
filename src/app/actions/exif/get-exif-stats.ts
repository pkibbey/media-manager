'use server';

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

  // Use the new get_exif_stats RPC for efficient stats retrieval
  const { data, error } = await supabase.rpc('get_exif_stats');
  if (error) throw error;

  // The RPC returns an array with a single object
  // Convert any potential bigint values to JavaScript numbers
  const rawStats = data?.[0] || { total: 0, success: 0, failed: 0 };

  const counts = {
    total: Number(rawStats.total) || 0,
    success: Number(rawStats.success) || 0,
    failed: Number(rawStats.failed) || 0,
  };

  const unifiedStats: UnifiedStats = {
    status: 'success',
    message: `${counts.success} of ${counts.total} images have EXIF data`,
    counts,
    percentages: calculatePercentages(counts),
  };

  return unifiedStats;
}

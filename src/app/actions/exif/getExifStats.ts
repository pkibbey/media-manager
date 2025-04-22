'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { ExifStatsResult } from '@/types/db-types';

export async function getExifStats(): Promise<{
  success: boolean;
  stats?: ExifStatsResult;
  message?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get counts for all possible processing states
    const { count: successCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact' })
      .eq('type', 'exif')
      .eq('status', 'success');

    const { count: errorCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact' })
      .eq('type', 'exif')
      .eq('status', 'error');

    const { count: skippedCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact' })
      .eq('type', 'exif')
      .eq('status', 'skipped');

    // Calculate total processed (those with any processing state)
    const { count: totalCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact' })
      .eq('type', 'exif');

    const total = totalCount || 0;
    const with_exif = successCount || 0;
    const no_exif = errorCount || 0;
    const skipped = skippedCount || 0;
    const totalProcessed = with_exif + no_exif + skipped;
    const unprocessed = total - totalProcessed;

    return {
      success: true,
      stats: {
        with_exif,
        no_exif,
        skipped,
        unprocessed,
        total,
      },
    };
  } catch (error) {
    console.error('Error fetching EXIF stats:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

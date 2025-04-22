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
    // Calculate total processed (those with any processing state)
    const { count: mediaItemCount } = await supabase
      .from('media_items')
      .select('id, processing_states(*), file_types(*)', {
        count: 'exact',
        head: true,
      })
      .eq('file_types.category', 'image')
      .eq('processing_states.type', 'exif')
      .not('processing_states.status', 'eq', 'success')
      .not('processing_states.status', 'eq', 'error')
      .not('processing_states.status', 'eq', 'skipped')
      .is('exif_data', null);

    console.log('mediaItemCount: ', mediaItemCount);
    // Get counts for all possible processing states
    const { count: successCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'exif')
      .eq('status', 'success');

    const { count: errorCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'exif')
      .eq('status', 'error');

    const { count: skippedCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'exif')
      .eq('status', 'skipped');

    const total = mediaItemCount || 0;
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

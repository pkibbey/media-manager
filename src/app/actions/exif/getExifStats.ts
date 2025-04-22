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
    // Get the true total of all image files
    const { count: totalImageCount } = await supabase
      .from('media_items')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('file_types.category', 'image');

    // Get counts for all possible processing states
    const { count: successCount } = await supabase
      .from('media_items')
      .select('id, file_types!inner(*), processing_states(*)', {
        count: 'exact',
      })
      .eq('file_types.category', 'image')
      .eq('processing_states.type', 'exif')
      .eq('processing_states.status', 'success');

    const { count: errorCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'exif')
      .eq('status', 'error')
      .eq('media_items.file_types.category', 'image');

    const { count: skippedCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'exif')
      .eq('status', 'skipped')
      .eq('media_items.file_types.category', 'image');

    const with_exif = successCount || 0;
    const no_exif = errorCount || 0;
    const skipped = skippedCount || 0;
    const total = totalImageCount || 0;
    const unprocessed = total - with_exif - no_exif - skipped;
    console.log('skipped: ', skipped);
    console.log('no_exif: ', no_exif);
    console.log('with_exif: ', with_exif);
    console.log('total: ', total);

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

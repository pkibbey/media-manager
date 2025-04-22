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

    // For debugging: count media items and file types
    const { count: total } = await supabase
      .from('media_items')
      .select('id', { count: 'exact', head: true });

    const { count: filesWithExifCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact' })
      .eq('type', 'exif')
      .eq('status', 'success');

    // Check if we can directly join media_items with file_types
    const { count: filesWithoutExifCount } = await supabase
      .from('processing_states')
      .select('id', { count: 'exact' })
      .eq('type', 'exif')
      .eq('status', 'error');

    const stats = {
      with_exif: filesWithExifCount || 0,
      processed_no_exif: filesWithoutExifCount || 0,
      total_compatible: total || 0,
    };

    return {
      success: true,
      stats: {
        ...stats,
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

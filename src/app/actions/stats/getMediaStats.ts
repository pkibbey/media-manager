'use server';
import { includeMedia } from '@/lib/mediaFilters';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaStats } from '@/types/media-types';

/**
 * Get comprehensive statistics about media items in the system
 */
export async function getMediaStats(): Promise<{
  success: boolean;
  data?: MediaStats;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get total count of media items
    const { count: totalCount } = await includeMedia(
      supabase
        .from('media_items')
        .select('id, file_types!inner(*)', { count: 'exact', head: true }),
    );

    // Get total size of all media
    const { data: sizeData } = await supabase.rpc('sum_file_sizes').single();

    const totalSizeBytes = sizeData?.sum || 0;

    // Get exif processing success count
    const { count: processedCount } = await includeMedia(
      supabase
        .from('media_items')
        .select('id, processing_states!inner(*), file_types!inner(*)', {
          count: 'exact',
          head: true,
        })
        .eq('processing_states.type', 'exif')
        .eq('processing_states.status', 'success'),
    );

    // Get exif processing error count
    const { count: unprocessedCount } = await includeMedia(
      supabase
        .from('media_items')
        .select('id, processing_states!inner(*), file_types!inner(*)', {
          count: 'exact',
          head: true,
        })
        .eq('processing_states.type', 'exif')
        .eq('processing_states.status', 'error'),
    );

    // Get exif processing skipped count
    const { count: skippedCount } = await includeMedia(
      supabase
        .from('media_items')
        .select('id, processing_states!inner(*), file_types!inner(*)', {
          count: 'exact',
          head: true,
        })
        .eq('processing_states.type', 'exif')
        .eq('processing_states.status', 'skipped'),
    );

    // Get ignored files count - this specifically counts files with ignored file types
    const { count: ignoredCount } = await includeMedia(
      supabase
        .from('media_items')
        .select('id, file_types!inner(*)', { count: 'exact', head: true })
        .eq('file_types.ignore', true),
    );

    // Get timestamp correction needs
    const { count: needsTimestampCorrectionCount } = await includeMedia(
      supabase
        .from('media_items')
        .select('id, processing_states!inner(*), file_types!inner(*)', {
          count: 'exact',
          head: true,
        })
        .is('media_date', null)
        .eq('processing_states.type', 'timestamp_correction')
        .not('processing_states.status', 'eq', 'failed'),
    );

    return {
      success: true,
      data: {
        totalMediaItems: totalCount || 0,
        totalSizeBytes,
        processedCount: processedCount || 0,
        unprocessedCount: unprocessedCount || 0,
        ignoredCount: ignoredCount || 0,
        skippedCount: skippedCount || 0,
        needsTimestampCorrectionCount: needsTimestampCorrectionCount || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching media stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

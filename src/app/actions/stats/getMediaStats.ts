'use server';
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
    const { count: totalCount } = await supabase
      .from('media_items')
      .select('*, file_types!inner(*)', { count: 'exact', head: true });

    // Get total size of all media
    const { data: sizeData } = await supabase.rpc('sum_file_sizes').single();

    const totalSizeBytes = sizeData?.sum || 0;

    // Get exif processing success count
    const { count: processedCount } = await supabase
      .from('media_items')
      .select('id, processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .eq('processing_states.type', 'exif')
      .eq('processing_states.status', 'success');

    // Get exif processing error count
    const { count: unprocessedCount } = await supabase
      .from('media_items')
      .select('id, processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .eq('processing_states.type', 'exif')
      .eq('processing_states.status', 'error');

    // Get exif processing skipped count
    const { count: skippedCount } = await supabase
      .from('media_items')
      .select('id, processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .eq('processing_states.type', 'exif')
      .eq('processing_states.status', 'skipped');

    // Get ignored files count
    const { count: ignoredCount } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });

    // Get timestamp correction needs
    const { count: needsTimestampCorrectionCount } = await supabase
      .from('media_items')
      .select('id, processing_states!inner(*)', {
        count: 'exact',
        head: true,
      })
      .is('media_date', null)
      .eq('processing_states.type', 'timestamp_correction')
      .not('processing_states.status', 'eq', 'failed');

    // Get items by category using RPC
    const { data: mediaData } = await supabase.rpc('get_media_statistics');

    // Build category count map - handle undefined/non-array responses safely
    const itemsByCategory: Record<string, number> = {};
    if (mediaData && Array.isArray(mediaData)) {
      mediaData.forEach((item: any) => {
        if (item.category) {
          itemsByCategory[item.category] = item.count;
        }
      });
    }

    // Get items grouped by extension
    const { data: extensionData } = await supabase.rpc(
      'get_extension_statistics',
    );

    // Build extension count map - handle undefined/non-array responses safely
    const itemsByExtension: Record<string, number> = {};
    if (extensionData && Array.isArray(extensionData)) {
      extensionData.forEach((item: any) => {
        if (item.extension) {
          itemsByExtension[item.extension] = item.count;
        }
      });
    }

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
        itemsByCategory,
        itemsByExtension,
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

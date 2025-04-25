'use server';

import { includeMedia } from '@/lib/media-filters';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ExifStatsResult } from '@/types/db-types';

export async function getExifStats(): Promise<{
  success: boolean;
  stats?: ExifStatsResult;
  message?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get total count of all media items (eligible for EXIF processing)
    // We're not using processing_states here because we want to count ALL files
    const { count: totalImageCount, error: totalError } = await includeMedia(
      supabase.from('media_items').select('id, file_types!inner(*)', {
        count: 'exact',
        head: true,
      }),
    );

    if (totalError) {
      console.error('Error getting total image count:', totalError);
      return {
        success: false,
        message: `Database error: ${totalError.message}`,
      };
    }

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

    if (successError) {
      console.error('Error getting success count:', successError);
      return {
        success: false,
        message: `Database error: ${successError.message}`,
      };
    }

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

    if (errorCountError) {
      console.error('Error getting error count:', errorCountError);
      return {
        success: false,
        message: `Database error: ${errorCountError.message}`,
      };
    }

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

    if (skippedError) {
      console.error('Error getting skipped count:', skippedError);
      return {
        success: false,
        message: `Database error: ${skippedError.message}`,
      };
    }

    const stats = {
      with_exif: successCount || 0,
      with_errors: errorCount || 0,
      skipped: skippedCount || 0,
      total: totalImageCount || 0,
    };

    return {
      success: true,
      stats,
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

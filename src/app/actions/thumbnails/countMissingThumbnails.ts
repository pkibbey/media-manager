'use server';
import { includeMedia } from '@/lib/mediaFilters';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Count the number of media items missing thumbnails
 */

export async function countMissingThumbnails(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    const { count: totalImageCount, error: countError } = await includeMedia(
      supabase
        .from('media_items')
        .select('*, processing_states!inner(*), file_types!inner(*)', {
          count: 'exact',
          head: true,
        })
        .eq('processing_states.type', 'thumbnail')
        .is('thumbnail_path', null),
    );

    if (countError) {
      throw new Error(`Failed to count total images: ${countError.message}`);
    }

    return {
      success: true,
      count: totalImageCount || 0,
    };
  } catch (error: any) {
    console.error('Error counting missing thumbnails:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

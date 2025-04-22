'use server';
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

    const {
      data,
      count: totalImageCount,
      error: countError,
    } = await supabase
      .from('media_items')
      .select('*, processing_states(*), file_types!inner(*)', {
        count: 'exact',
      })
      .eq('file_types.category', 'image')
      .eq('processing_states.type', 'thumbnail')
      .not('processing_states.status', 'eq', 'success')
      .not('processing_states.status', 'eq', 'error')
      .not('processing_states.status', 'eq', 'skipped')
      .is('thumbnail_path', null);

    console.log('data: ', data?.[0]);
    console.log('totalImageCount: ', totalImageCount);

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

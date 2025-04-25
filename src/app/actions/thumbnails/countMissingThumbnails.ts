'use server';
import { includeMedia } from '@/lib/media-filters';
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

    // Count items that need thumbnail processing
    const { count: missingThumbnailsCount, error: countError } =
      await includeMedia(
        supabase
          .from('media_items')
          .select('*, processing_states!inner(*), file_types!inner(*)', {
            count: 'exact',
            head: true,
          })
          // type not thumbnail and status not in ['complete', 'failed']
          .neq('processing_states.type', 'thumbnail'),
      );

    if (countError) {
      throw new Error(
        `Failed to count missing thumbnails: ${countError.message}`,
      );
    }

    return {
      success: true,
      count: missingThumbnailsCount || 0,
    };
  } catch (error: any) {
    console.error('Error counting missing thumbnails:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

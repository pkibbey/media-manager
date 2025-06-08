'use server';

import { createSupabase } from 'shared';
import type { MediaWithRelations } from 'shared/types';

/**
 * Fetch detailed information for a single media item
 */
export async function getMediaDetail(mediaId: string): Promise<{
  media: MediaWithRelations | null;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();

    const { data: media, error } = await supabase
      .from('media')
      .select('*, media_types (*), exif_data (*), analysis_data(*)')
      .eq('id', mediaId)
      .single();

    if (error) {
      throw error;
    }

    return {
      media: media as MediaWithRelations | null,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching media detail:', error);
    return {
      media: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

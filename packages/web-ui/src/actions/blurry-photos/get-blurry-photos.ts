'use server';

import { createSupabase } from 'shared';
import type { MediaWithRelations } from 'shared/types';

/**
 * Get all detected blurry photos (solid color images)
 */
export async function getBlurryPhotos(): Promise<MediaWithRelations[]> {
  try {
    const supabase = createSupabase();

    const { data: mediaItems, error } = await supabase
      .from('media')
      .select(`
        *,
        media_types(*),
        exif_data(*),
        analysis_data(*)
      `)
      .eq('blurry_photo_process', 'solid_color')
      .is('is_deleted', false)
      .is('is_hidden', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blurry photos:', error);
      return [];
    }

    return mediaItems || [];
  } catch (error) {
    console.error('Error getting blurry photos:', error);
    return [];
  }
}

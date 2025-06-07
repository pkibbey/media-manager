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
      .select(`
        id,
        media_path,
        size_bytes,
        is_deleted,
        is_hidden,
        thumbnail_url,
        thumbnail_process,
        media_types (
          mime_type,
          is_ignored
        ),
        exif_data (
          width,
          height,
          exif_timestamp,
          fix_date_process,
          exif_process,
          aperture,
          camera_make,
          camera_model,
          digital_zoom_ratio,
          exposure_time,
          focal_length_35mm,
          gps_latitude,
          gps_longitude,
          iso,
          lens_id,
          lens_model,
          light_source,
          metering_mode,
          orientation,
          scene_capture_type,
          subject_distance,
          depth_of_field,
          field_of_view,
          flash
        ),
        analysis_data(
          image_description,
          keywords
        )
      `)
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

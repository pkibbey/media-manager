'use server';

import { createSupabase } from 'shared';

export interface MediaDetail {
  id: string;
  media_path: string;
  size_bytes: number;
  is_deleted: boolean;
  is_hidden: boolean;
  thumbnail_url: string | null;
  thumbnail_process: string | null;
  exif_process: string | null;
  media_types?: {
    mime_type: string | null;
    is_ignored: boolean;
  } | null;
  exif_data?: {
    width: number | null;
    height: number | null;
    exif_timestamp: string | null;
    fix_date_process: string | null;
    aperture: number | null;
    camera_make: string | null;
    camera_model: string | null;
    digital_zoom_ratio: number | null;
    exposure_time: string | null;
    focal_length_35mm: number | null;
    gps_latitude: number | null;
    gps_longitude: number | null;
    iso: number | null;
    lens_id: string | null;
    lens_model: string | null;
    light_source: string | null;
    metering_mode: string | null;
    orientation: number | null;
    scene_capture_type: string | null;
    subject_distance: number | null;
    depth_of_field: string | null;
    field_of_view: string | null;
    flash: string | null;
  } | null;
  analysis_data?: {
    image_description: string | null;
    keywords: string[] | null;
  } | null;
}

/**
 * Fetch detailed information for a single media item
 */
export async function getMediaDetail(mediaId: string): Promise<{
  media: MediaDetail | null;
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
        exif_process,
        media_types (
          mime_type,
          is_ignored
        ),
        exif_data (
          width,
          height,
          exif_timestamp,
          fix_date_process,
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
        analysis_data (
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
      media: media as MediaDetail,
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

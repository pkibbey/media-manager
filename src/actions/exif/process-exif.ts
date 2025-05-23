'use server';

import { isValid } from 'date-fns';
import { exiftool } from 'exiftool-vendored';
import type { MediaWithExif } from '@/types/media-types';
import type { TablesInsert } from '@/types/supabase';

/**
 * Extract EXIF data from a media item without performing database operations
 *
 * @param mediaItem - The media item to process
 * @returns Object with extracted EXIF data and success status
 */
export async function extractExifData(mediaItem: MediaWithExif) {
  try {
    const exif = await exiftool.read(mediaItem.media_path);

    if (!exif) {
      return {
        success: true,
        mediaId: mediaItem.id,
        noData: true,
      };
    }

    const exif_timestamp = exif.DateTimeOriginal || exif.CreateDate;

    // Extract useful EXIF data into a structured format
    const exifData: TablesInsert<'exif_data'> = {
      aperture: exif.FNumber || null,
      camera_make: exif.Make || null,
      camera_model: exif.Model || null,
      digital_zoom_ratio: exif.DigitalZoomRatio
        ? Number.parseFloat(exif.DigitalZoomRatio.toString())
        : null,
      exif_timestamp: isValid(exif_timestamp) ? String(exif_timestamp) : null,
      exposure_time: exif.ExposureTime || null,
      focal_length_35mm: exif.FocalLengthIn35mmFormat
        ? Number.parseFloat(exif.FocalLengthIn35mmFormat.toString())
        : null,
      gps_latitude: exif.GPSLatitude
        ? Number.parseFloat(exif.GPSLatitude.toString())
        : null,
      gps_longitude: exif.GPSLongitude
        ? Number.parseFloat(exif.GPSLongitude.toString())
        : null,
      height: exif.ImageHeight || 0,
      iso: exif.ISO ? Number.parseInt(exif.ISO.toString(), 10) : null,
      light_source: exif.LightSource || null,
      media_id: mediaItem.id,
      metering_mode: exif.MeteringMode || null,
      orientation: exif.Orientation || null,
      scene_capture_type: exif.SceneCaptureType || null,
      subject_distance: exif.SubjectDistance
        ? Number.parseFloat(exif.SubjectDistance.toString())
        : null,
      width: exif.ImageWidth || 0,
      lens_id: exif.LensID || null,
      lens_spec: exif.LensSpec || null,
      depth_of_field: exif.DOF || null,
      field_of_view: exif.FOV || null,
      flash: exif.Flash || null,
    };

    return {
      success: true,
      mediaId: mediaItem.id,
      exifData,
    };
  } catch (processingError) {
    console.error(
      `Error extracting EXIF for media ${mediaItem.id}:`,
      processingError,
    );
    return {
      success: false,
      mediaId: mediaItem.id,
      error:
        processingError instanceof Error
          ? processingError.message
          : 'Unknown processing error',
    };
  }
}

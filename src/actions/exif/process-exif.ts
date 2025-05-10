'use server';

import { ExifTool } from 'exiftool-vendored';
import { v4 } from 'uuid';
import { createSupabase } from '@/lib/supabase';
import type { MediaWithExif } from '@/types/media-types';

const exiftool = new ExifTool();

function setMediaAsExifProcessed(mediaId: string) {
  const supabase = createSupabase();

  return supabase
    .from('media')
    .update({ is_exif_processed: true })
    .eq('id', mediaId);
}

type ExifData = {
  id: string;
  aperture: number | null;
  camera_make: string | null;
  camera_model: string | null;
  created_date: string | undefined;
  digital_zoom_ratio: number | null;
  exif_timestamp: string | null;
  exposure_time: string | null;
  focal_length_35mm: number | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  height: number;
  iso: number | null;
  light_source: string | null;
  media_id: string;
  metering_mode: string | null;
  orientation: number | null;
  scene_capture_type: string | null;
  subject_distance: number | null;
  width: number;
  lens_id: string | null;
  lens_spec: string | null;
  depth_of_field: string | null;
  field_of_view: string | null;
  flash: string | null;
};

/**
 * Process EXIF data for a media item
 *
 * @param mediaItem - The media item to process
 * @returns Object with success status and any error message
 */
export async function processExif(mediaItem: MediaWithExif) {
  try {
    const supabase = createSupabase();
    let exifData: ExifData | null = null;

    try {
      const exif = await exiftool.read(mediaItem.media_path);

      if (!exif) {
        console.log(`No EXIF data found for ${mediaItem.id}`);

        const { error } = await setMediaAsExifProcessed(mediaItem.id);

        if (error) {
          return {
            success: false,
            error: `Failed to mark media as processed: ${error.message}`,
          };
        }

        return {
          success: false,
          message: 'No EXIF data found, marked as processed',
        };
      }

      // Add mimetype to the file_types table
      // Update mimetype of the media item

      // Extract useful EXIF data into a structured format
      exifData = {
        id: v4(),
        aperture: exif.FNumber || null,
        camera_make: exif.Make || null,
        camera_model: exif.Model || null,
        created_date: String(exif.DateTimeOriginal) || undefined,
        digital_zoom_ratio: exif.DigitalZoomRatio
          ? Number.parseFloat(exif.DigitalZoomRatio.toString())
          : null,
        exif_timestamp: String(exif.CreateDate) || null,
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
    } catch (processingError) {
      console.error(
        `Error processing EXIF for media ${mediaItem.id}:`,
        processingError,
      );
      return {
        success: false,
        error:
          processingError instanceof Error
            ? processingError.message
            : 'Unknown processing error',
      };
    }

    console.log('exifData: ', exifData);

    // Store the normalized EXIF data
    const { error: insertError } = await supabase
      .from('exif_data')
      .upsert(exifData, {
        onConflict: 'media_id', // Correctly specify the column to match for conflict resolution
      });

    if (insertError) {
      console.log('insertError: ', insertError);
      throw new Error(`Failed to insert EXIF data: ${insertError.message}`);
    }

    // Update the media item to mark it as processed
    const { error: updateError } = await setMediaAsExifProcessed(mediaItem.id);

    if (updateError) {
      console.log('updateError: ', updateError);
      throw new Error(`Failed to update media status: ${updateError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing EXIF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

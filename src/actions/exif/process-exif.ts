'use server';

import { isValid } from 'date-fns';
import { exiftool } from 'exiftool-vendored';
import { v4 } from 'uuid';
import { createSupabase } from '@/lib/supabase';
import type { MediaWithExif } from '@/types/media-types';

function setMediaAsExifProcessed(mediaId: string) {
  const supabase = createSupabase();

  return supabase
    .from('media')
    .update({ is_exif_processed: true })
    .eq('id', mediaId);
}

export type ExifData = {
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

    const now = new Date().toISOString();
    const exif_timestamp = exif.DateTimeOriginal || exif.CreateDate;

    // Extract useful EXIF data into a structured format
    const exifData: ExifData = {
      id: v4(),
      aperture: exif.FNumber || null,
      camera_make: exif.Make || null,
      camera_model: exif.Model || null,
      created_date: now,
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

/**
 * Process EXIF data for a media item
 *
 * @param mediaItem - The media item to process
 * @returns Object with success status and any error message
 */
export async function processExif(mediaItem: MediaWithExif) {
  try {
    const totalStart = performance.now();
    const supabase = createSupabase();
    let exifData: ExifData | null = null;

    try {
      const extractionStart = performance.now();
      const extractionResult = await extractExifData(mediaItem);
      const extractionTime = performance.now() - extractionStart;
      console.log(
        `EXIF extraction took ${extractionTime}ms for ${mediaItem.id}`,
      );

      if (!extractionResult.success) {
        return {
          success: false,
          error: extractionResult.error || 'Failed to extract EXIF data',
        };
      }

      if (extractionResult.noData) {
        const { error } = await setMediaAsExifProcessed(mediaItem.id);

        if (error) {
          return {
            success: false,
            error: `Failed to mark media as processed: ${error.message}`,
          };
        }

        return {
          success: true,
          message: 'No EXIF data found, marked as processed',
        };
      }

      if (!('exifData' in extractionResult) || !extractionResult.exifData) {
        return {
          success: false,
          error: 'Missing EXIF data in extraction result',
        };
      }

      exifData = extractionResult.exifData;
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

    // Store the normalized EXIF data
    const dbInsertStart = performance.now();
    const { error: insertError } = await supabase
      .from('exif_data')
      .upsert(exifData, {
        onConflict: 'media_id',
      });
    const dbInsertTime = performance.now() - dbInsertStart;
    console.log(`DB insertion took ${dbInsertTime}ms for ${mediaItem.id}`);

    if (insertError) {
      throw new Error(`Failed to insert EXIF data: ${insertError.message}`);
    }

    // Update the media item to mark it as processed
    const statusUpdateStart = performance.now();
    const { error: updateError } = await setMediaAsExifProcessed(mediaItem.id);
    const statusUpdateTime = performance.now() - statusUpdateStart;
    console.log(`Status update took ${statusUpdateTime}ms for ${mediaItem.id}`);

    if (updateError) {
      throw new Error(`Failed to update media status: ${updateError.message}`);
    }

    const totalTime = performance.now() - totalStart;
    console.log(
      `Total EXIF processing took ${totalTime}ms for ${mediaItem.id}`,
    );

    return { success: true };
  } catch (error) {
    console.error('Error processing EXIF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

'use server';

import { isValid } from 'date-fns';
import { exiftool } from 'exiftool-vendored';
import { createSupabase } from 'shared';
import type { MediaWithExif } from 'shared';
import type { TablesInsert } from 'shared';

/**
 * Extract EXIF data from a media item and save it to the database
 *
 * @param mediaItem - The media item to process
 * @returns Object with extracted EXIF data and success status
 */
export async function processExif(
	mediaItem: Pick<MediaWithExif, 'id' | 'media_path'>,
) {
	try {
		const exif = await exiftool.read(mediaItem.media_path);

		if (!exif) {
			// Update media item as processed even if no EXIF data was found
			const supabase = createSupabase();
			await supabase
				.from('media')
				.update({ is_exif_processed: true })
				.eq('id', mediaItem.id);

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

		// Save EXIF data to database and update media flag
		const supabase = createSupabase();

		// 1. Insert/update the EXIF data
		const { error: insertError } = await supabase
			.from('exif_data')
			.upsert(exifData, {
				onConflict: 'media_id',
			});

		if (insertError) {
			throw new Error(`Failed to save EXIF data: ${insertError.message}`);
		}

		// 2. Update the media item as processed
		const { error: updateError } = await supabase
			.from('media')
			.update({ is_exif_processed: true })
			.eq('id', mediaItem.id);

		if (updateError) {
			throw new Error(
				`Failed to update media processing status: ${updateError.message}`,
			);
		}

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

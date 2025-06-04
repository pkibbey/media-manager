'use server';

import { createSupabase } from 'shared';

/**
 * Check for columns in the exif_data table where every single value is null
 *
 * @returns Object with column analysis results
 */
export async function checkNullColumns(): Promise<{
  nullColumns: string[];
  columnStats: Record<
    string,
    { total: number; nullCount: number; nullPercentage: number }
  >;
  error: unknown;
}> {
  try {
    const supabase = createSupabase();

    // First, get the total count of records
    const { count: totalCount, error: countError } = await supabase
      .from('exif_data')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to get total count: ${countError.message}`);
    }

    if (!totalCount || totalCount === 0) {
      return {
        nullColumns: [],
        columnStats: {},
        error: 'No records found in exif_data table',
      };
    }

    // Define nullable columns to check (excluding non-nullable columns like id, media_id, height, width)
    const nullableColumns = [
      'aperture',
      'camera_make',
      'camera_model',
      'depth_of_field',
      'digital_zoom_ratio',
      'exif_timestamp',
      'exposure_time',
      'field_of_view',
      'flash',
      'focal_length_35mm',
      'gps_latitude',
      'gps_longitude',
      'iso',
      'lens_id',
      'lens_model',
      'light_source',
      'metering_mode',
      'orientation',
      'scene_capture_type',
      'subject_distance',
    ];

    const columnStats: Record<
      string,
      { total: number; nullCount: number; nullPercentage: number }
    > = {};
    const nullColumns: string[] = [];

    // Check each nullable column
    for (const column of nullableColumns) {
      const { count: nullCount, error: nullError } = await supabase
        .from('exif_data')
        .select('*', { count: 'exact', head: true })
        .is(column, null);

      if (nullError) {
        console.error(`Error checking column ${column}:`, nullError);
        continue;
      }

      const nullCountValue = nullCount || 0;
      const nullPercentage = (nullCountValue / totalCount) * 100;

      columnStats[column] = {
        total: totalCount,
        nullCount: nullCountValue,
        nullPercentage: Math.round(nullPercentage * 100) / 100, // Round to 2 decimal places
      };

      // If all values are null (100% null), add to nullColumns array
      if (nullCountValue === totalCount) {
        nullColumns.push(column);
      }
    }

    return {
      nullColumns,
      columnStats,
      error: null,
    };
  } catch (error) {
    console.error('Error checking null columns:', error);
    return {
      nullColumns: [],
      columnStats: {},
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

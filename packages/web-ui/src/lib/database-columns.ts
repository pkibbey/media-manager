import type { Tables } from 'shared/types';

// Utility type to extract column names from table types
type ColumnNames<T> = T extends Record<string, any> ? (keyof T)[] : never;

// Type-safe column extraction for each table
export const getTableColumns = {
  analysis_data: (): ColumnNames<Tables<'analysis_data'>> => [
    'adult_content',
    'analysis_process',
    'confidence_score',
    'created_at',
    'faces',
    'id',
    'image_description',
    'keywords',
    'media_id',
    'medical_content',
    'objects',
    'racy_content',
    'spoofed',
    'tags',
    'text',
    'updated_at',
    'violence',
  ],

  duplicates: (): ColumnNames<Tables<'duplicates'>> => [
    'created_at',
    'duplicate_id',
    'hamming_distance',
    'id',
    'media_id',
    'similarity_score',
  ],

  exif_data: (): ColumnNames<Tables<'exif_data'>> => [
    'aperture',
    'camera_make',
    'camera_model',
    'color_space',
    'created_at',
    'depth_of_field',
    'digital_zoom_ratio',
    'exif_process',
    'exif_timestamp',
    'exposure_bias',
    'exposure_mode',
    'exposure_program',
    'exposure_time',
    'field_of_view',
    'fix_date_process',
    'flash',
    'focal_length_35mm',
    'gps_latitude',
    'gps_longitude',
    'height',
    'id',
    'iso',
    'lens_id',
    'lens_model',
    'light_source',
    'media_id',
    'metering_mode',
    'orientation',
    'scene_capture_type',
    'shutter_speed',
    'subject_distance',
    'updated_at',
    'white_balance',
    'width',
  ],

  media: (): ColumnNames<Tables<'media'>> => [
    'blurry_photo_process',
    'created_at',
    'id',
    'is_deleted',
    'is_hidden',
    'media_path',
    'media_type_id',
    'size_bytes',
    'thumbnail_process',
    'thumbnail_url',
    'updated_at',
    'visual_hash',
  ],

  media_types: (): ColumnNames<Tables<'media_types'>> => [
    'id',
    'is_ignored',
    'is_native',
    'mime_type',
  ],
} as const;

// Helper function to get filtered columns for specific analysis types
export const getAnalysisColumns = {
  contentWarnings: () =>
    [
      'adult_content',
      'racy_content',
      'violence',
      'medical_content',
      'spoofed',
      'confidence_score',
      'analysis_process',
    ] as const,

  objectDetection: () =>
    [
      'objects',
      'faces',
      'tags',
      'text',
      'confidence_score',
      'analysis_process',
    ] as const,

  advancedAnalysis: () =>
    [
      'image_description',
      'keywords',
      'tags',
      'text',
      'confidence_score',
      'analysis_process',
    ] as const,
} as const;

export const getMediaColumns = {
  thumbnails: () => ['thumbnail_url', 'thumbnail_process'] as const,
  visualHash: () => ['visual_hash'] as const,
} as const;

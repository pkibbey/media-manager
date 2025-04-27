/**
 * Type for EXIF extraction method
 */
export type ExtractionMethod =
  | 'default'
  | 'sharp-only'
  | 'direct-only'
  | 'marker-only';

/**
 * Type for EXIF processing options
 */
export type ExifProcessingOptions = {
  extractionMethod?: ExtractionMethod; // A/B testing method
};

/**
 * Type for EXIF extraction method options
 * - default: Try Sharp first, then use direct extraction as fallback
 * - direct-only: Only use direct extraction
 * - marker-only: Only use marker extraction
 * - sharp-only: Only use Sharp extraction
 */
export type ExtractionMethod =
  | 'default'
  | 'direct-only'
  | 'marker-only'
  | 'sharp-only';

/**
 * Type for EXIF processing options
 */
export type ExifProcessingOptions = {
  extractionMethod?: ExtractionMethod; // A/B testing method
};

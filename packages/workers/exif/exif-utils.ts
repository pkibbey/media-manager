import type { Tags as ExiftoolTags } from 'exiftool-vendored';
import type { ExifData, ExifrOutput, TablesInsert } from 'shared/types';

/**
 * Parse raw EXIF data into a standardized format for database storage
 * Handles data from both exifr and exiftool-vendored libraries with proper type safety
 *
 * @param exif - Raw EXIF data from exifr or exiftool-vendored
 * @param mediaId - The media item ID to associate with the EXIF data
 * @returns Standardized EXIF data object that matches the database schema
 */
export function standardizeExif(
  exif: ExifData,
  mediaId: string,
): TablesInsert<'exif_data'> {
  // Handle date/time extraction from various sources with priority order
  const exif_timestamp = extractDate(
    exif.DateTimeOriginal || exif.CreateDate || exif.DateTime,
  );

  // Handle GPS coordinates with specialized GPS extraction
  const gps_latitude = extractGPSCoordinate(exif.GPSLatitude);
  const gps_longitude = extractGPSCoordinate(exif.GPSLongitude);

  // Extract dimensions with fallbacks and validation
  const height = safeInteger(exif.ImageHeight || exif.ExifImageHeight) || 0;
  const width = safeInteger(exif.ImageWidth || exif.ExifImageWidth) || 0;

  // Handle library-specific field mappings
  let lensInfo: string | null = null;
  let flash: string | null = null;

  if (isExiftoolData(exif)) {
    // ExifTool has more comprehensive lens and flash information
    lensInfo = safeString(exif.LensID || exif.LensModel || exif.Lens);
    flash = safeString(exif.Flash);
  } else if (isExifrData(exif)) {
    // exifr has some specific fields
    lensInfo = safeString(exif.LensID || exif.LensModel);
    flash = safeString(exif.Flash);
  }

  return {
    aperture: safeNumber(exif.FNumber),
    camera_make: safeString(exif.Make),
    camera_model: safeString(exif.Model),
    digital_zoom_ratio: safeNumber(exif.DigitalZoomRatio),
    exif_timestamp: exif_timestamp ? exif_timestamp.toISOString() : null,
    exposure_time: safeString(exif.ExposureTime),
    focal_length_35mm: safeNumber(exif.FocalLengthIn35mmFormat),
    gps_latitude,
    gps_longitude,
    height,
    iso: safeInteger(exif.ISO),
    light_source: safeString(exif.LightSource),
    media_id: mediaId,
    metering_mode: safeString(exif.MeteringMode),
    orientation: safeInteger(exif.Orientation),
    scene_capture_type: safeString(exif.SceneCaptureType),
    subject_distance: safeNumber(exif.SubjectDistance),
    width,
    lens_id: lensInfo,
    lens_model: safeString(exif.LensModel),
    depth_of_field: safeString(exif.DOF),
    field_of_view: safeString(exif.FOV),
    flash,
  };
}

/**
 * Type guard to check if the EXIF data comes from exiftool-vendored
 * ExiftoolTags has more comprehensive typing and special date handling
 */
export function isExiftoolData(data: ExifData): data is ExiftoolTags {
  if (!data || typeof data !== 'object') return false;

  // ExiftoolTags typically has more comprehensive metadata and different date handling
  // We can check for specific ExifTool-only fields
  if ('SourceFile' in data || 'ExifToolVersion' in data) return true;

  // ExifTool dates often have special objects with toDate() methods
  if (
    data.DateTimeOriginal &&
    typeof data.DateTimeOriginal === 'object' &&
    data.DateTimeOriginal !== null &&
    'toDate' in data.DateTimeOriginal
  ) {
    return true;
  }

  return false;
}

/**
 * Type guard to check if the EXIF data comes from exifr
 */
export function isExifrData(data: ExifData): data is ExifrOutput {
  return !isExiftoolData(data);
}

/**
 * Enhanced safe number conversion that handles various input types from both libraries
 * Supports exifr and exiftool-vendored specific formats
 */
export function safeNumber(value: unknown): number | null {
  if (value == null) return null;

  // Handle direct numbers
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  // Handle string representations
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;

    // Handle fraction format (e.g., "1/60" for exposure time)
    if (trimmed.includes('/')) {
      const [numerator, denominator] = trimmed.split('/').map(Number);
      if (
        !Number.isNaN(numerator) &&
        !Number.isNaN(denominator) &&
        denominator !== 0
      ) {
        return numerator / denominator;
      }
    }

    const parsed = Number.parseFloat(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  // Handle arrays (GPS coordinates sometimes come as arrays)
  if (Array.isArray(value) && value.length > 0) {
    return safeNumber(value[0]);
  }

  // Handle exiftool-vendored special objects
  if (typeof value === 'object' && value !== null) {
    // Some exiftool fields have numeric values in special wrapper objects
    if ('rawValue' in value) {
      return safeNumber((value as any).rawValue);
    }
    if ('val' in value) {
      return safeNumber((value as any).val);
    }
  }

  return null;
}

/**
 * Enhanced safe integer conversion with better handling of EXIF-specific formats
 */
export function safeInteger(value: unknown): number | null {
  const num = safeNumber(value);
  return num !== null ? Math.floor(num) : null;
}

/**
 * Enhanced safe string conversion that handles EXIF-specific string formats
 */
export function safeString(value: unknown): string | null {
  if (value == null) return null;

  // Handle direct strings
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  // Handle numbers
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : null;
  }

  // Handle boolean values (some EXIF fields use these)
  if (typeof value === 'boolean') {
    return value.toString();
  }

  // Handle arrays (convert to comma-separated string)
  if (Array.isArray(value)) {
    const stringified = value
      .map((item) => safeString(item))
      .filter(Boolean)
      .join(', ');
    return stringified || null;
  }

  // Handle exiftool-vendored special objects
  if (typeof value === 'object' && value !== null) {
    // Handle description objects
    if ('description' in value) {
      return safeString((value as any).description);
    }
    if ('rawValue' in value) {
      return safeString((value as any).rawValue);
    }
    if ('val' in value) {
      return safeString((value as any).val);
    }
    // Convert object to string as fallback
    if ('toString' in value && typeof (value as any).toString === 'function') {
      return safeString((value as any).toString());
    }
  }

  // Fallback conversion
  return String(value) || null;
}

/**
 * Enhanced date extraction and normalization for various EXIF date formats
 * Handles both exifr and exiftool-vendored date representations
 */
export function extractDate(value: unknown): Date | null {
  if (!value) return null;

  // Handle Date objects directly (from exifr)
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Handle exiftool-vendored ExifDate/ExifDateTime objects
  if (typeof value === 'object' && value !== null) {
    // ExifTool date objects with toDate() method
    if ('toDate' in value && typeof (value as any).toDate === 'function') {
      try {
        const date = (value as any).toDate();
        return date instanceof Date && !isNaN(date.getTime()) ? date : null;
      } catch {
        return null;
      }
    }

    // ExifTool date objects with toJSDate() method
    if ('toJSDate' in value && typeof (value as any).toJSDate === 'function') {
      try {
        const date = (value as any).toJSDate();
        return date instanceof Date && !isNaN(date.getTime()) ? date : null;
      } catch {
        return null;
      }
    }

    // Handle objects with rawValue property
    if ('rawValue' in value) {
      return extractDate((value as any).rawValue);
    }

    // Handle objects with val property
    if ('val' in value) {
      return extractDate((value as any).val);
    }
  }

  // Handle string dates
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Handle EXIF date format: "YYYY:MM:DD HH:MM:SS"
    if (/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      const isoString = trimmed.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle partial EXIF dates: "YYYY:MM:DD"
    if (/^\d{4}:\d{2}:\d{2}$/.test(trimmed)) {
      const isoString = trimmed.replace(/:/g, '-');
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? null : date;
    }

    // Try standard Date parsing for ISO strings and other formats
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  // Handle numeric timestamps (seconds or milliseconds since epoch)
  if (typeof value === 'number') {
    // Assume milliseconds if > year 2000 in seconds, otherwise convert from seconds
    const timestamp = value > 946684800 ? value : value * 1000;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Specialized GPS coordinate extraction that handles various formats
 * GPS coordinates can come in many different formats from both libraries
 */
export function extractGPSCoordinate(value: unknown): number | null {
  if (!value) return null;

  // Handle direct numeric values
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  // Handle string coordinates (e.g., "37.7749° N")
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Extract numeric part from coordinate strings
    const match = trimmed.match(/^([-+]?\d+(?:\.\d+)?)/);
    if (match) {
      let coord = Number.parseFloat(match[1]);

      // Handle hemisphere indicators (S and W should be negative)
      if (/[SW]$/i.test(trimmed)) {
        coord = Math.abs(coord) * -1;
      }

      return Number.isFinite(coord) ? coord : null;
    }
  }

  // Handle coordinate arrays [degrees, minutes, seconds] format
  if (Array.isArray(value) && value.length >= 2) {
    const [degrees, minutes = 0, seconds = 0] = value.map(Number);

    if (Number.isFinite(degrees)) {
      let coord =
        Math.abs(degrees) +
        (Number.isFinite(minutes) ? Math.abs(minutes) / 60 : 0) +
        (Number.isFinite(seconds) ? Math.abs(seconds) / 3600 : 0);

      // Preserve original sign
      if (degrees < 0) coord *= -1;

      return coord;
    }
  }

  // Handle objects with coordinate data
  if (typeof value === 'object' && value !== null) {
    if ('rawValue' in value) {
      return extractGPSCoordinate((value as any).rawValue);
    }
    if ('val' in value) {
      return extractGPSCoordinate((value as any).val);
    }
  }

  return null;
}

export const exifOptions = {
  // Segments (JPEG APP Segment, PNG Chunks, HEIC Boxes, etc...)
  tiff: true,
  xmp: false,
  icc: false,
  iptc: false,
  jfif: false, // (jpeg only)
  ihdr: false, // (png only)
  // Sub-blocks inside TIFF segment
  exif: true,
  gps: true,
  interop: false,
  // Formatters - configured for consistent output
  translateKeys: true, // Convert numeric tags to readable names
  translateValues: true, // Convert enum values to readable strings
  reviveValues: true, // Convert dates to Date objects and other transformations
  sanitize: true, // Remove unnecessary data
  mergeOutput: true, // Merge all segments into single object
  silentErrors: true, // Don't throw on parsing errors
  // Chunked reader for performance
  chunked: true,
  // Pick only the tags we actually use to improve performance
  pick: [
    // Camera information
    'Make',
    'Model',
    'LensID',
    'LensModel',
    'LensSpec',
    // Image dimensions
    'ImageWidth',
    'ImageHeight',
    'ExifImageWidth',
    'ExifImageHeight',
    'Orientation',
    // Capture settings
    'ISO',
    'FNumber',
    'ExposureTime',
    'FocalLengthIn35mmFormat',
    'DigitalZoomRatio',
    'LightSource',
    'MeteringMode',
    'SceneCaptureType',
    'SubjectDistance',
    'Flash',
    // Date/time
    'DateTimeOriginal',
    'CreateDate',
    'DateTime',
    // GPS
    'GPSLatitude',
    'GPSLongitude',
    // Additional metadata
    'DOF',
    'FOV',
  ],
};

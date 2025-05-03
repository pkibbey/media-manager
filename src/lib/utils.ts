import { type ClassValue, clsx } from 'clsx';
import type { Tags } from 'exifreader';
import { twMerge } from 'tailwind-merge';
import type { MediaItem } from '@/types/db-types';
import type { UnifiedStats } from '@/types/unified-stats';
import { fileTypeCache } from './file-type-cache';

/**
 * Combines class names with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get a keyboard-accessible index from arrow key navigation in a grid
 */
export function getKeyboardNavigationIndex(
  currentIndex: number,
  key: string,
  itemsLength: number,
  columnsCount: number,
): number {
  switch (key) {
    case 'ArrowRight':
      return Math.min(currentIndex + 1, itemsLength - 1);
    case 'ArrowLeft':
      return Math.max(currentIndex - 1, 0);
    case 'ArrowDown':
      return Math.min(currentIndex + columnsCount, itemsLength - 1);
    case 'ArrowUp':
      return Math.max(currentIndex - columnsCount, 0);
    case 'Home':
      return 0;
    case 'End':
      return itemsLength - 1;
    default:
      return currentIndex;
  }
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${
    // biome-ignore lint/style/useExponentiationOperator: <explanation>
    (bytes / Math.pow(1024, i)).toFixed(2)
  } ${sizes[i]}`;
}

/**
 * Sanitize EXIF data for storage in database
 * Removes circular references and converts Date objects to ISO strings
 */
export function sanitizeExifData(exifData: Tags | null | undefined): any {
  if (!exifData) return null;

  const processed = new Set();

  function sanitizeValue(value: any): any {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle basic types
    if (typeof value !== 'object') {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item));
    }

    // Handle circular references
    if (processed.has(value)) {
      return '[Circular Reference]';
    }

    // Process object
    processed.add(value);
    const result: Record<string, any> = {};

    for (const key in value) {
      if (Object.hasOwn(value, key)) {
        try {
          result[key] = sanitizeValue(value[key]);
        } catch (e) {
          result[key] = `[Error: Unable to sanitize] - ${e}`;
        }
      }
    }

    return result;
  }

  return sanitizeValue(exifData);
}

/**
 * Extract date from filename using common patterns
 */
export function extractDateFromFilename(filename: string): Date | null {
  // Remove file extension
  const nameWithoutExtension = filename.split('.').slice(0, -1).join('.');

  // Common date patterns in filenames
  const patterns = [
    // YYYY-MM-DD, YYYY_MM_DD
    {
      regex: /(\d{4})[-_](\d{2})[-_](\d{2})/,
      format: (match: RegExpMatchArray) =>
        new Date(`${match[1]}-${match[2]}-${match[3]}`),
    },
    // YYYYMMDD
    {
      regex: /\D(\d{8})\D/,
      format: (match: RegExpMatchArray) => {
        const dateStr = match[1];
        return new Date(
          `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`,
        );
      },
    },
    // YYYY-MM-DD-HH-MM-SS, YYYY_MM_DD_HH_MM_SS
    {
      regex: /(\d{4})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})/,
      format: (match: RegExpMatchArray) =>
        new Date(
          `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`,
        ),
    },
    // YYYYMMDD_HHMMSS
    {
      regex: /(\d{8})[-_](\d{6})/,
      format: (match: RegExpMatchArray) => {
        const dateStr = match[1];
        const timeStr = match[2];
        return new Date(
          `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}T` +
            `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:${timeStr.substring(4, 6)}`,
        );
      },
    },
    // IMG_YYYYMMDD_HHMMSS
    {
      regex: /IMG[-_](\d{8})[-_](\d{6})/i,
      format: (match: RegExpMatchArray) => {
        const dateStr = match[1];
        const timeStr = match[2];
        return new Date(
          `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}T` +
            `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:${timeStr.substring(4, 6)}`,
        );
      },
    },
    // VID_YYYYMMDD_HHMMSS
    {
      regex: /VID[-_](\d{8})[-_](\d{6})/i,
      format: (match: RegExpMatchArray) => {
        const dateStr = match[1];
        const timeStr = match[2];
        return new Date(
          `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}T` +
            `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:${timeStr.substring(4, 6)}`,
        );
      },
    },
    // DSC_YYYYMMDD_HHMMSS
    {
      regex: /DSC[-_](\d{8})[-_](\d{6})/i,
      format: (match: RegExpMatchArray) => {
        const dateStr = match[1];
        const timeStr = match[2];
        return new Date(
          `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}T` +
            `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:${timeStr.substring(4, 6)}`,
        );
      },
    },
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = nameWithoutExtension.match(pattern.regex);
    if (match) {
      try {
        const date = pattern.format(match);
        // Check if date is valid and not in the future
        if (!isNaN(date.getTime()) && date <= new Date()) {
          return date;
        }
      } catch (error) {
        console.error('Error parsing date from filename:', error);
      }
    }
  }

  // If no patterns matched, return null
  return null;
}

/**
 * Generate a Google Maps URL from EXIF GPS tags
 */
export function getGoogleMapsUrl(
  latitude?: Tags['GPSLatitude'],
  longitude?: Tags['GPSLongitude'],
): string | null {
  const lat = dmsToDecimal(latitude);
  const lon = dmsToDecimal(longitude);
  if (lat === null || lon === null) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

// Helper to convert EXIF GPS tags ([ [deg,1], [min,1], [sec,1] ]) to decimal
function dmsToDecimal(
  dmsTag: Tags['GPSLatitude'] | Tags['GPSLongitude'],
): number | null {
  if (
    !dmsTag ||
    !Array.isArray(dmsTag.value) ||
    dmsTag.value.length !== 3 ||
    !Array.isArray(dmsTag.value[0]) ||
    !Array.isArray(dmsTag.value[1]) ||
    !Array.isArray(dmsTag.value[2])
  ) {
    return null;
  }
  const dms = dmsTag.value as [
    [number, number],
    [number, number],
    [number, number],
  ];
  const [deg, min, sec] = dms;
  const degrees = deg[0] / deg[1];
  const minutes = min[0] / min[1];
  const seconds = sec[0] / sec[1];
  return degrees + minutes / 60 + seconds / 3600;
}

/**
 * Helper function to convert GPS coordinates from DMS format to decimal degrees
 */
export function calculateGpsDecimal(
  coordinates: Tags['GPSLatitude'] | Tags['GPSLongitude'],
  ref: Tags['GPSLatitudeRef'] | Tags['GPSLongitudeRef'],
): number | undefined {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return undefined;
  }

  // Calculate decimal degrees from degrees, minutes, seconds
  let decimal = coordinates[0] + coordinates[1] / 60 + coordinates[2] / 3600;

  // Apply negative value for South or West references
  if (String(ref) === 'S' || String(ref) === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Format GPS coordinates into a readable format
 * @param latitude
 * @param longitude
 * @returns Formatted coordinates string
 */
export function formatGpsCoordinates(
  latitude?: Tags['GPSLatitude'],
  longitude?: Tags['GPSLongitude'],
): string | null {
  if (
    !latitude ||
    !longitude ||
    !Array.isArray(latitude.value) ||
    !Array.isArray(longitude.value)
  ) {
    return null;
  }

  const lat = dmsToDecimal(latitude);
  const lon = dmsToDecimal(longitude);

  if (lat === null || lon === null) {
    return null;
  }

  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';

  const absLat = Math.abs(lat);
  const absLon = Math.abs(lon);

  return `${absLat.toFixed(6)}° ${latDir}, ${absLon.toFixed(6)}° ${lonDir}`;
}

/**
 * Formats camera information from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted camera string or undefined if not available
 */
export function formatCameraInfo(exifData?: Tags | null): string | undefined {
  if (!exifData || !exifData.Image) return undefined;

  const make = exifData.Make?.toString().trim();
  const model = exifData.Model?.toString().trim();

  if (make && model) {
    // Remove redundant manufacturer name from model if present
    if (model.startsWith(make)) {
      return model;
    }
    return `${make} ${model}`;
  }

  return model || make;
}

/**
 * Formats lens information from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted lens string or undefined if not available
 */
export function formatLensInfo(exifData?: Tags | null): string | undefined {
  if (!exifData) return undefined;

  // Lens information is typically stored in Photo section
  const lensModel = exifData.LensModel?.toString().trim();
  const lensMake = exifData.LensMake?.toString().trim();

  if (lensModel) {
    if (lensMake && !lensModel.includes(lensMake)) {
      return `${lensMake} ${lensModel}`;
    }
    return lensModel;
  }

  return undefined;
}

/**
 * Formats exposure settings from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted exposure string or undefined if not available
 */
export function formatExposureInfo(exifData?: Tags | null): string | undefined {
  if (!exifData) return undefined;

  const parts: string[] = [];

  // Format aperture (f-stop)
  if (exifData.ApertureValue) {
    parts.push(`ƒ/${Number(exifData.ApertureValue).toFixed(1)}`);
  }

  if (exifData.FNumber) {
    parts.push(`ƒ/${Number(exifData.FNumber).toFixed(1)}`);
  }

  // Format shutter speed
  if (exifData.ShutterSpeedValue) {
    const shutterSpeed = exifData.ShutterSpeedValue;
    // ShutterSpeedValue is often stored as APEX value (log2-based)
    // Convert from APEX to seconds: 2^(-ShutterSpeedValue)
    // biome-ignore lint/style/useExponentiationOperator: <explanation>
    const seconds = Math.pow(2, -shutterSpeed);

    if (seconds < 1) {
      // Calculate denominator for fraction (1/x)
      const denominator = Math.round(1 / seconds);
      parts.push(`1/${denominator}s`);
    } else {
      parts.push(`${seconds.toFixed(1)}s`);
    }
  } else if (exifData.ExposureTime) {
    const exposureTime = Number(exifData.ExposureTime);
    if (exposureTime < 1) {
      const denominator = Math.round(1 / exposureTime);
      parts.push(`1/${denominator}s`);
    } else {
      parts.push(`${exposureTime.toFixed(1)}s`);
    }
  }

  // Format ISO
  if (exifData.ISOSpeedRatings) {
    const iso = Array.isArray(exifData.ISOSpeedRatings)
      ? exifData.ISOSpeedRatings[0]
      : exifData.ISOSpeedRatings;
    parts.push(`ISO ${iso}`);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Formats focal length information from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted focal length string or undefined if not available
 */
export function formatFocalLength(exifData?: Tags | null): string | undefined {
  if (!exifData || !exifData.Photo) return undefined;

  const focalLength = Number(exifData.FocalLength);
  const focalLengthIn35mm = Number(exifData.FocalLengthIn35mmFilm);

  if (focalLength) {
    if (focalLengthIn35mm && focalLength !== focalLengthIn35mm) {
      return `${focalLength.toFixed(0)}mm (${focalLengthIn35mm.toFixed(0)}mm equiv.)`;
    }
    return `${focalLength.toFixed(0)}mm`;
  }

  return undefined;
}

/**
 * Helper function to properly type exif_data from database
 * @param item MediaItem from database
 * @returns Strongly typed T object or null
 */
export function getExifData(item: MediaItem): Tags | null {
  return item.exif_data as Tags | null;
}

/**
 * Get MIME type for a file
 * @param fileTypeId The file type ID to use
 */
export async function getMimeType(
  fileTypeId?: number | null,
): Promise<string | null> {
  if (fileTypeId !== undefined && fileTypeId !== null) {
    return fileTypeCache.getMimeTypeById(fileTypeId);
  }

  return null;
}

/**
 * Get the category of a file based on its file type ID
 * @param fileTypeId The file type ID to check
 * @returns File category (e.g. "image", "video", "data", "other")
 */
export async function getFileCategory(
  fileTypeId: number | null,
): Promise<string> {
  // If fileTypeId is provided, use it to get the category
  if (fileTypeId !== undefined && fileTypeId !== null) {
    const fileType = await fileTypeCache.getFileTypeById(fileTypeId);
    if (fileType?.category) {
      return fileType.category;
    }
  }

  // Return "other" as the default category if no file type ID is provided
  // or if the file type ID doesn't map to a known category
  return 'other';
}

/**
 * Helper function to calculate percentages from counts
 */
export function calculatePercentages(counts: UnifiedStats['counts']): {
  completed: number;
  error: number;
} {
  const total = counts.total || 0;
  const percentages = {
    completed: 0,
    error: 0,
  };

  if (total === 0) return percentages;

  // Calculate completed percentage
  if (counts.success !== undefined) {
    percentages.completed = Math.round((counts.success / total) * 100);
  }

  // Calculate error percentage
  if (counts.failed !== undefined) {
    percentages.error = Math.round((counts.failed / total) * 100);
  }

  return percentages;
}

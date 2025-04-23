import { type ClassValue, clsx } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import type { Exif } from 'exif-reader';
import { twMerge } from 'tailwind-merge';
import type { MediaItem } from '@/types/db-types';
import { LARGE_FILE_THRESHOLD } from './consts';
import { fileTypeCache } from './file-type-cache';

/**
 * Combines class names with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string, formatString = 'PP') {
  try {
    const date = new Date(dateString);
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date string to a relative time (e.g. "2 days ago")
 */
export function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
}

/**
 * Check if a file format can be natively displayed in most browsers
 * @param fileTypeId The file type ID to check
 */
export async function canDisplayNatively(
  fileTypeId?: number | null,
): Promise<boolean> {
  // If fileTypeId is provided, use that instead
  if (fileTypeId !== undefined && fileTypeId !== null) {
    const fileType = await fileTypeCache.getFileTypeById(fileTypeId);
    // Use the can_display_natively property if available
    if (fileType?.can_display_natively !== null) {
      return fileType?.can_display_natively === true;
    }
  }
  return false;
}

/**
 * Check if a file needs conversion to be displayed on web
 * @param fileTypeId The file type ID to check
 */
export async function needsConversion(
  fileTypeId?: number | null,
): Promise<boolean> {
  if (fileTypeId !== undefined && fileTypeId !== null) {
    return fileTypeCache.needsConversionById(fileTypeId);
  }

  return false;
}

/**
 * Check if a file is an image
 * @param fileTypeId The file type ID to check
 */
export async function isImage(fileTypeId?: number | null): Promise<boolean> {
  if (fileTypeId !== undefined && fileTypeId !== null) {
    return fileTypeCache.isImageById(fileTypeId);
  }
  return false;
}

/**
 * Check if a file is a video
 * @param fileTypeId The file type ID to check
 */
export async function isVideo(fileTypeId?: number | null): Promise<boolean> {
  if (fileTypeId !== undefined && fileTypeId !== null) {
    return fileTypeCache.isVideoById(fileTypeId);
  }
  return false;
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

export function bytesToSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${
    // biome-ignore lint/style/useExponentiationOperator: <explanation>
    (bytes / Math.pow(1024, i)).toFixed(2)
  } ${sizes[i]}`;
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  return bytesToSize(bytes);
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
 * Generate a Google Maps URL from coordinates
 */
export function getGoogleMapsUrl(
  latitude?: number,
  longitude?: number,
): string | null {
  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * Format GPS coordinates into a readable format
 * @param latitude
 * @param longitude
 * @returns Formatted coordinates string
 */
export function formatGpsCoordinates(
  latitude?: number,
  longitude?: number,
): string | null {
  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';

  const absLat = Math.abs(latitude);
  const absLon = Math.abs(longitude);

  return `${absLat.toFixed(6)}° ${latDir}, ${absLon.toFixed(6)}° ${lonDir}`;
}

/**
 * Formats camera information from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted camera string or undefined if not available
 */
export function formatCameraInfo(exifData?: Exif | null): string | undefined {
  if (!exifData || !exifData.Image) return undefined;

  const make = exifData.Image.Make?.toString().trim();
  const model = exifData.Image.Model?.toString().trim();

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
export function formatLensInfo(exifData?: Exif | null): string | undefined {
  if (!exifData) return undefined;

  // Lens information is typically stored in Photo section
  const lensModel = exifData.Photo?.LensModel?.toString().trim();
  const lensMake = exifData.Photo?.LensMake?.toString().trim();

  if (lensModel) {
    if (lensMake && !lensModel.includes(lensMake)) {
      return `${lensMake} ${lensModel}`;
    }
    return lensModel;
  }

  // If no specific lens model, try LensInfo array
  const lensInfo = exifData.Photo?.LensSpecification;
  if (Array.isArray(lensInfo) && lensInfo.length > 0) {
    return `${lensInfo[0]}-${lensInfo[1]}mm f/${lensInfo[2]}-${lensInfo[3]}`;
  }

  return undefined;
}

/**
 * Formats exposure settings from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted exposure string or undefined if not available
 */
export function formatExposureInfo(exifData?: Exif | null): string | undefined {
  if (!exifData) return undefined;

  const parts: string[] = [];

  // Format aperture (f-stop)
  if (exifData.Photo?.ApertureValue) {
    parts.push(`ƒ/${exifData.Photo.ApertureValue.toFixed(1)}`);
  } else if (exifData.Photo?.FNumber) {
    parts.push(`ƒ/${exifData.Photo.FNumber.toFixed(1)}`);
  }

  // Format shutter speed
  if (exifData.Photo?.ShutterSpeedValue) {
    const shutterSpeed = exifData.Photo.ShutterSpeedValue;
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
  } else if (exifData.Photo?.ExposureTime) {
    const exposureTime = exifData.Photo.ExposureTime;
    if (exposureTime < 1) {
      const denominator = Math.round(1 / exposureTime);
      parts.push(`1/${denominator}s`);
    } else {
      parts.push(`${exposureTime.toFixed(1)}s`);
    }
  }

  // Format ISO
  if (exifData.Photo?.ISOSpeedRatings) {
    const iso = Array.isArray(exifData.Photo.ISOSpeedRatings)
      ? exifData.Photo.ISOSpeedRatings[0]
      : exifData.Photo.ISOSpeedRatings;
    parts.push(`ISO ${iso}`);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Formats focal length information from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted focal length string or undefined if not available
 */
export function formatFocalLength(exifData?: Exif | null): string | undefined {
  if (!exifData || !exifData.Photo) return undefined;

  const focalLength = exifData.Photo.FocalLength;
  const focalLengthIn35mm = exifData.Photo.FocalLengthIn35mmFilm;

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
 * @returns Strongly typed Exif object or null
 */
export function getExifData(item: MediaItem): Exif | null {
  return item.exif_data as Exif | null;
}

/**
 * Sanitize EXIF data to remove problematic characters that PostgreSQL can't handle
 * Specifically targets null bytes (\u0000) and other invalid unicode that causes
 * the "unsupported Unicode escape sequence" error
 */
export function sanitizeExifData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Replace null bytes and other control characters that might cause issues
    // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
    return data.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  }

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map((item) => sanitizeExifData(item));
    }

    const result: Record<string, any> = {};
    for (const key in data) {
      if (Object.hasOwn(data, key)) {
        // Recursively sanitize nested objects
        result[key] = sanitizeExifData(data[key]);
      }
    }
    return result;
  }

  // For numbers, booleans, etc., return as is
  return data;
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
 * Applies standard filters to a Supabase query to exclude ignored file types
 * @param query The Supabase query to modify
 * @returns The modified query with ignore filter applied
 */
export function excludeIgnoredFileTypes(query: any): any {
  return query.eq('file_types.ignore', false);
}

export function isSkippedLargeFile(fileSize: number): boolean {
  return fileSize > LARGE_FILE_THRESHOLD;
}

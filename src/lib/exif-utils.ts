'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import exifr from 'exifr';

export interface ExifData {
  // Basic image information
  Make?: string; // Camera manufacturer
  Model?: string; // Camera model
  Software?: string; // Software used
  ModifyDate?: Date; // Date modified
  CreateDate?: Date; // Creation date
  DateTimeOriginal?: Date; // Original date taken

  // Camera settings
  ISO?: number; // ISO speed rating
  ShutterSpeedValue?: number; // Shutter speed
  ApertureValue?: number; // Aperture
  FocalLength?: number; // Focal length
  FocalLengthIn35mmFormat?: number; // Equivalent focal length
  LensInfo?: string[]; // Lens information
  LensMake?: string; // Lens manufacturer
  LensModel?: string; // Lens model

  // Image specifics
  ImageWidth?: number; // Image width
  ImageHeight?: number; // Image height
  Orientation?: number; // Image orientation

  // Geo location data
  latitude?: number; // GPS latitude
  longitude?: number; // GPS longitude
  GPSAltitude?: number; // GPS altitude

  // Additional metadata
  Copyright?: string; // Copyright information
  Artist?: string; // Artist/photographer
}

/**
 * Extracts EXIF data from an image file
 * @param filePath Path to the image file
 * @returns Promise resolving to EXIF data or null if extraction fails
 */
export async function extractExifData(
  filePath: string,
): Promise<ExifData | null> {
  try {
    // Use exifr to parse the file
    const data = await exifr.parse(filePath, {
      // Customize which tags to extract
      gps: true, // Include GPS data
      tiff: true, // Include TIFF data
      exif: true, // Include EXIF data
      iptc: true, // Include IPTC data
      xmp: true, // Include XMP data
      icc: false, // Exclude ICC data (color profiles) to reduce size
      jfif: false, // Exclude JFIF data to reduce size
      mergeOutput: true, // Merge all data into a single object
    });

    return data || null;
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    return null;
  }
}

/**
 * Extract date information from EXIF data or filename
 * @param filePath Path to the image file
 * @param exifData Optional: Pre-extracted EXIF data
 * @returns Best determined date or null
 */
export async function extractDateFromMediaFile(
  filePath: string,
  exifData?: ExifData | null,
): Promise<Date | null> {
  let newExifData: ExifData | null = null;

  // 1. Try to get EXIF data if not provided
  if (!exifData) {
    newExifData = await extractExifData(filePath);
  }

  // 2. Try to get date from EXIF data
  if (newExifData) {
    // Priority order for date fields
    if (newExifData.DateTimeOriginal) return newExifData.DateTimeOriginal;
    if (newExifData.CreateDate) return newExifData.CreateDate;
    if (newExifData.ModifyDate) return newExifData.ModifyDate;
  }

  // 3. Try to extract date from filename using common patterns
  const filename = path.basename(filePath);

  // Common date patterns in filenames:
  // YYYY-MM-DD, YYYYMMDD, IMG_YYYYMMDD, etc.
  const datePatterns = [
    // YYYY-MM-DD or YYYY_MM_DD
    { regex: /(\d{4})[_-](\d{2})[_-](\d{2})/, groups: [1, 2, 3] },

    // YYYYMMDD
    {
      regex: /\D(\d{8})\D/,
      groups: [1, 2, 3],
      groupProcess: (match: string) => {
        return [
          match.substring(0, 4),
          match.substring(4, 6),
          match.substring(6, 8),
        ];
      },
    },

    // IMG_YYYYMMDD, DSC_YYYYMMDD, etc.
    {
      regex: /\w+_(\d{8})/,
      groups: [1],
      groupProcess: (match: string) => {
        return [
          match.substring(0, 4),
          match.substring(4, 6),
          match.substring(6, 8),
        ];
      },
    },

    // YYYY-MM-DD-HHMMSS
    { regex: /(\d{4})[_-](\d{2})[_-](\d{2})[_-](\d{6})/, groups: [1, 2, 3] },
  ];

  for (const pattern of datePatterns) {
    const match = filename.match(pattern.regex);
    if (match) {
      try {
        let yearStr: string;
        let monthStr: string;
        let dayStr: string;

        if (pattern.groupProcess) {
          const processed = pattern.groupProcess(match[pattern.groups[0]]);
          [yearStr, monthStr, dayStr] = processed;
        } else {
          yearStr = match[pattern.groups[0]];
          monthStr = match[pattern.groups[1]];
          dayStr = match[pattern.groups[2]];
        }

        const year = Number.parseInt(yearStr);
        const month = Number.parseInt(monthStr) - 1; // JS months are 0-based
        const day = Number.parseInt(dayStr);

        // Validate the date
        if (
          year > 1900 &&
          year < 2100 &&
          month >= 0 &&
          month < 12 &&
          day > 0 &&
          day <= 31
        ) {
          return new Date(year, month, day);
        }
      } catch (e) {
        // Continue to the next pattern if parsing fails
        // continue;
      }
    }
  }

  // 4. If all else fails, get file stats and use mtime
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch (error) {
    return null;
  }
}

/**
 * Format GPS coordinates into a readable format
 * @param latitude
 * @param longitude
 * @returns Formatted coordinates string
 */
export async function formatGpsCoordinates(
  latitude?: number,
  longitude?: number,
): Promise<string | null> {
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
 * Generate a Google Maps URL from coordinates
 */
export async function getGoogleMapsUrl(
  latitude?: number,
  longitude?: number,
): Promise<string | null> {
  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * Formats camera information from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted camera string or undefined if not available
 */
export async function formatCameraInfo(
  exifData?: ExifData | null,
): Promise<string | undefined> {
  if (!exifData) return undefined;

  const make = exifData.Make?.trim();
  const model = exifData.Model?.trim();

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
export async function formatLensInfo(
  exifData?: ExifData | null,
): Promise<string | undefined> {
  if (!exifData) return undefined;

  const lensModel = exifData.LensModel?.trim();
  const lensMake = exifData.LensMake?.trim();

  if (lensModel) {
    if (lensMake && !lensModel.includes(lensMake)) {
      return `${lensMake} ${lensModel}`;
    }
    return lensModel;
  }

  // If no specific lens model, try LensInfo array
  const lensInfo = exifData.LensInfo;
  if (Array.isArray(lensInfo) && lensInfo.length > 0) {
    return lensInfo.join(' ');
  }

  return undefined;
}

/**
 * Formats exposure settings from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted exposure string or undefined if not available
 */
export async function formatExposureInfo(
  exifData?: ExifData | null,
): Promise<string | undefined> {
  if (!exifData) return undefined;

  const parts: string[] = [];

  // Format aperture (f-stop)
  if (exifData.ApertureValue) {
    parts.push(`f/${exifData.ApertureValue.toFixed(1)}`);
  }

  // Format shutter speed
  if (exifData.ShutterSpeedValue) {
    // Convert to fraction if needed
    const shutterSpeed = exifData.ShutterSpeedValue;
    if (shutterSpeed < 1) {
      // Calculate denominator for fraction (1/x)
      const denominator = Math.round(1 / shutterSpeed);
      parts.push(`1/${denominator}s`);
    } else {
      parts.push(`${shutterSpeed.toFixed(1)}s`);
    }
  }

  // Format ISO
  if (exifData.ISO) {
    parts.push(`ISO ${exifData.ISO}`);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Formats focal length information from EXIF data
 * @param exifData The EXIF data object
 * @returns Formatted focal length string or undefined if not available
 */
export async function formatFocalLength(
  exifData?: ExifData | null,
): Promise<string | undefined> {
  if (!exifData) return undefined;

  const focalLength = exifData.FocalLength;
  const focalLengthIn35mm = exifData.FocalLengthIn35mmFormat;

  if (focalLength) {
    if (focalLengthIn35mm && focalLength !== focalLengthIn35mm) {
      return `${focalLength.toFixed(0)}mm (${focalLengthIn35mm.toFixed(0)}mm equiv.)`;
    }
    return `${focalLength.toFixed(0)}mm`;
  }

  return undefined;
}

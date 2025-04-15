'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ExifData } from '@/types';
import exifr from 'exifr';

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

'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import exifReader, { type Exif } from 'exif-reader';
import sharp from 'sharp';

/**
 * Extracts EXIF data from an image file using exif-reader
 * @param filePath Path to the image file
 * @returns Promise resolving to EXIF data or null if extraction fails
 */
export async function extractMetadata(filePath: string): Promise<Exif | null> {
  try {
    // Read the file as a buffer
    const fileBuffer = await fs.readFile(filePath);
    let exifData = null;

    try {
      // Try to extract EXIF data from the buffer
      exifData = exifReader(fileBuffer);
    } catch (error) {
      console.log(
        `Primary EXIF extraction failed for ${filePath}, trying alternatives...`,
      );

      // If the direct extraction fails, try to find the EXIF marker
      try {
        // JPEG files typically have EXIF data starting after the APP1 marker (0xFFE1)
        const app1Marker = Buffer.from([0xff, 0xe1]);
        const markerIndex = fileBuffer.indexOf(app1Marker);

        if (markerIndex !== -1) {
          // Extract EXIF data block - skip the marker (2 bytes) and length (2 bytes)
          const exifBlock = fileBuffer.slice(markerIndex + 4);
          exifData = exifReader(exifBlock);
          if (exifData) return exifData;
        }
      } catch (innerError) {
        console.error('Error extracting EXIF data via markers:', innerError);
      }

      // Try using Sharp as a fallback for image formats it supports
      try {
        console.log(`Attempting to extract EXIF with Sharp for ${filePath}`);
        const extension = path.extname(filePath).toLowerCase();
        const supportedExtensions = [
          '.jpg',
          '.jpeg',
          '.png',
          '.webp',
          '.tiff',
          '.gif',
          '.avif',
        ];

        if (supportedExtensions.includes(extension)) {
          const metadata = await sharp(filePath).metadata();

          if (metadata.exif) {
            try {
              // Parse EXIF buffer from Sharp
              const sharpExif = exifReader(metadata.exif);
              console.log(
                `Successfully extracted EXIF with Sharp for ${filePath}`,
              );
              return sharpExif;
            } catch (exifParseError) {
              console.error('Error parsing EXIF from Sharp:', exifParseError);
            }
          }

          // Even if no EXIF, create a basic metadata object from Sharp data
          if (metadata) {
            console.log(`Created basic metadata from Sharp for ${filePath}`);
            return metadata.exif ? exifReader(metadata.exif) : null;
          }
        }
      } catch (sharpError) {
        console.error('Sharp extraction failed:', sharpError);
      }

      // All attempts failed
      return null;
    }

    if (!exifData) {
      return null;
    }

    // Add file format information to the EXIF data for consistency
    const format = path.extname(filePath).substring(1).toLowerCase();

    // Convert exifReader format to match what our application expects
    return exifData;
  } catch (error) {
    console.error('Error reading file or extracting EXIF data:', error);
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
  exifData?: Exif | null,
): Promise<Date | null> {
  let newMetadata: Exif | null = null;

  // 1. Try to get EXIF data if not provided
  if (!exifData) {
    newMetadata = await extractMetadata(filePath);
  } else {
    newMetadata = exifData;
  }

  // 2. Try to get date from EXIF data
  if (newMetadata) {
    // Priority order for date fields - check nested Photo structure first
    if (newMetadata.Photo?.DateTimeOriginal) {
      return newMetadata.Photo.DateTimeOriginal;
    }

    // Then check Image section for DateTime
    if (newMetadata.Image?.DateTime) {
      return newMetadata.Image.DateTime;
    }
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

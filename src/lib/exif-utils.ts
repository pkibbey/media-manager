'use server';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ExtractionMethod } from '@/types/exif';
import exifReader, { type Exif } from 'exif-reader';
import sharp from 'sharp';

/**
 * Extracts EXIF data using only the Sharp library
 */
async function extractMetadataWithSharp(
  filePath: string,
): Promise<Exif | null> {
  try {
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
          return exifReader(metadata.exif);
        } catch (exifParseError) {
          console.error('Error parsing EXIF from Sharp:', exifParseError);
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting via Sharp:', error);
    return null;
  }
}

/**
 * Extracts EXIF data using only direct extraction with exifReader
 */
async function extractMetadataDirectOnly(
  filePath: string,
): Promise<Exif | null> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return exifReader(fileBuffer);
  } catch (error) {
    console.error('Error extracting EXIF data directly:', error);
    return null;
  }
}

/**
 * Extracts EXIF data using only marker-based extraction
 */
async function extractMetadataMarkerOnly(
  filePath: string,
): Promise<Exif | null> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    // JPEG files typically have EXIF data starting after the APP1 marker (0xFFE1)
    const app1Marker = Buffer.from([0xff, 0xe1]);
    const markerIndex = fileBuffer.indexOf(app1Marker);

    if (markerIndex !== -1) {
      // Extract EXIF data block - skip the marker (2 bytes) and length (2 bytes)
      const exifBlock = fileBuffer.slice(markerIndex + 4);
      return exifReader(exifBlock);
    }
    return null;
  } catch (error) {
    console.error('Error extracting EXIF data via markers:', error);
    return null;
  }
}

/**
 * Original implementation with multiple fallbacks
 */
async function extractMetadataWithFallbacks(
  filePath: string,
): Promise<Exif | null> {
  try {
    // Read the file as a buffer
    const fileBuffer = await fs.readFile(filePath);
    let exifData = null;

    try {
      // Try to extract EXIF data from the buffer
      exifData = exifReader(fileBuffer);
    } catch (error) {
      console.error('Error extracting EXIF data directly:', error);
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
              return sharpExif;
            } catch (exifParseError) {
              console.error('Error parsing EXIF from Sharp:', exifParseError);
            }
          }

          return null;
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

    // Convert exifReader format to match what our application expects
    return exifData;
  } catch (error) {
    console.error('Error reading file or extracting EXIF data:', error);
    return null;
  }
}

/**
 * Extracts EXIF data from an image file using the specified method
 * @param filePath Path to the image file
 * @param method The extraction method to use for A/B testing
 * @returns Promise resolving to EXIF data or null if extraction fails
 */
export async function extractMetadata({
  filePath,
  method,
}: {
  filePath: string;
  method: ExtractionMethod;
}): Promise<Exif | null> {
  try {
    // Choose extraction method based on parameter
    switch (method) {
      case 'sharp-only':
        return await extractMetadataWithSharp(filePath);
      case 'direct-only':
        return await extractMetadataDirectOnly(filePath);
      case 'marker-only':
        return await extractMetadataMarkerOnly(filePath);
      default:
        // Use the original implementation with multiple fallbacks
        return await extractMetadataWithFallbacks(filePath);
    }
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    return null;
  }
}

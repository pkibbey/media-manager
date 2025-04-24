'use server';
import fs from 'node:fs/promises';
import path from 'node:path';
import exifReader, { type Exif } from 'exif-reader';
import sharp from 'sharp';
import type { ExtractionMethod } from '@/types/exif';
import { includeMedia } from './mediaFilters';
import { createServerSupabaseClient } from './supabase';

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
      case 'direct-only':
        return await extractMetadataDirectOnly(filePath);
      case 'marker-only':
        return await extractMetadataMarkerOnly(filePath);
      default:
        return await extractMetadataWithSharp(filePath);
    }
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    return null;
  }
}

export async function extractAndSanitizeExifData(
  filePath: string,
  method: ExtractionMethod,
  progressCallback?: (message: string) => void,
): Promise<{
  success: boolean;
  exifData: Exif | null;
  sanitizedExifData: Exif | null;
  mediaDate: string | null;
  message: string;
}> {
  progressCallback?.(`Extracting metadata using ${method} method`);
  const exifData = await extractMetadata({
    filePath,
    method,
  });

  if (!exifData) {
    return {
      success: false,
      exifData: null,
      sanitizedExifData: null,
      mediaDate: null,
      message: 'No EXIF data found',
    };
  }

  // Import sanitizeExifData function
  progressCallback?.('Sanitizing EXIF data');
  const { sanitizeExifData } = await import('@/lib/utils');

  // Sanitize EXIF data before storing it
  const sanitizedExifData = sanitizeExifData(exifData);

  // Get media date from EXIF
  const mediaDate =
    exifData.Photo?.DateTimeOriginal?.toISOString() ||
    exifData.Image?.DateTime?.toISOString() ||
    null;

  return {
    success: true,
    exifData,
    sanitizedExifData,
    mediaDate,
    message: 'EXIF data extracted and sanitized successfully',
  };
}

// Helper function to get unprocessed files with a limit
export async function getUnprocessedFiles({ limit }: { limit: number }) {
  console.log('getUnprocessedFiles: ', limit);
  const supabase = createServerSupabaseClient();

  // First, get all media items that don't have an exif processing state
  const { data: filesWithoutProcessingState, error: error1 } =
    await includeMedia(
      supabase
        .from('media_items')
        .select('*, file_types!inner(*), processing_states(*)')
        .not('processing_states.type', 'eq', 'exif')
        .limit(limit),
    );

  if (error1) {
    console.error('Error fetching files without processing state:', error1);
    throw new Error('Failed to fetch unprocessed files');
  }

  // If we got enough files, return them
  if (
    filesWithoutProcessingState &&
    filesWithoutProcessingState.length >= limit
  ) {
    return filesWithoutProcessingState;
  }

  // If we didn't get enough files from the first query, get files with non-success states
  const remainingLimit = limit - (filesWithoutProcessingState?.length || 0);

  if (remainingLimit <= 0) {
    return filesWithoutProcessingState || [];
  }

  const { data: filesWithNonSuccessState, error: error2 } = await includeMedia(
    supabase
      .from('media_items')
      .select('*, processing_states(*), file_types!inner(*)')
      .eq('processing_states.type', 'exif')
      .or('status.eq.pending,status.eq.error', {
        foreignTable: 'processing_states',
      })
      .limit(remainingLimit),
  );

  if (error2) {
    console.error('Error fetching files with non-success state:', error2);
    // Still return what we got from the first query
    return filesWithoutProcessingState || [];
  }

  // Combine the results
  return [
    ...(filesWithoutProcessingState || []),
    ...(filesWithNonSuccessState || []),
  ];
}

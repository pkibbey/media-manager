'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import exifReader, { type Exif } from 'exif-reader';
import sharp from 'sharp';
import type { ExtractionMethod } from '@/types/exif';
import { createServerSupabaseClient } from './supabase';
import { sanitizeExifData } from '@/lib/utils';

/**
 * Extracts EXIF data using only the Sharp library
 */
async function extractMetadataWithSharp(
  filePath: string,
): Promise<Exif | null> {
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
      // Parse EXIF buffer from Sharp
      return exifReader(metadata.exif);
    }
  }

  return null;
}

/**
 * Extracts EXIF data using only direct extraction with exifReader
 */
async function extractMetadataDirectOnly(
  filePath: string,
): Promise<Exif | null> {
  const fileBuffer = await fs.readFile(filePath);
  return exifReader(fileBuffer);
}

/**
 * Extracts EXIF data using only marker-based extraction
 */
async function extractMetadataMarkerOnly(
  filePath: string,
): Promise<Exif | null> {
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
    // First check if the file exists
    try {
      await fs.access(filePath);
    } catch (accessError) {
      console.error(`File access error for ${filePath}:`, accessError);
      throw new Error(`File does not exist or is not accessible: ${filePath}`);
    }

    // Choose extraction method based on parameter
    switch (method) {
      case 'direct-only':
        return await extractMetadataDirectOnly(filePath);
      case 'marker-only':
        return await extractMetadataMarkerOnly(filePath);
      case 'sharp-only':
        return await extractMetadataWithSharp(filePath);
      default:
        // Try Sharp first, if it fails try direct extraction
        try {
          const sharpResult = await extractMetadataWithSharp(filePath);
          if (sharpResult) return sharpResult;
          
          // If Sharp didn't find EXIF data, try direct extraction
          console.log(`No EXIF found with Sharp for ${filePath}, trying direct extraction`);
          return await extractMetadataDirectOnly(filePath);
        } catch (sharpError) {
          console.error(`Sharp extraction failed for ${filePath}, trying direct:`, sharpError);
          return await extractMetadataDirectOnly(filePath);
        }
    }
  } catch (error) {
    console.error(`EXIF extraction error for ${filePath}:`, error);
    throw new Error(`Failed to extract EXIF data: ${error instanceof Error ? error.message : String(error)}`);
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
  progressCallback?.(`Extracting metadata using ${method} method from ${filePath}`);
  
  try {
    // Check if file exists before attempting extraction
    try {
      const stats = await fs.stat(filePath);
      console.log(`File ${filePath} exists, size: ${stats.size} bytes`);
    } catch (statError) {
      console.error(`File stat error for ${filePath}:`, statError);
      return {
        success: false,
        exifData: null,
        sanitizedExifData: null,
        mediaDate: null,
        message: `File access error: ${statError instanceof Error ? statError.message : String(statError)}`,
      };
    }
    
    const exifData = await extractMetadata({
      filePath,
      method,
    });

    if (!exifData) {
      console.log(`No EXIF data found in ${filePath}`);
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
    
    console.log(`Successfully extracted EXIF from ${filePath}, data:`, 
      exifData.Image ? `Contains Image section with ${Object.keys(exifData.Image).length} fields` : 'No Image section',
      exifData.Photo ? `Contains Photo section with ${Object.keys(exifData.Photo).length} fields` : 'No Photo section'
    );

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
  } catch (error) {
    console.error(`Error in extractAndSanitizeExifData for ${filePath}:`, error);
    return {
      success: false,
      exifData: null,
      sanitizedExifData: null,
      mediaDate: null,
      message: `EXIF extraction error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Helper function to get unprocessed files with a limit
export async function getUnprocessedFiles({ limit }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  // First, get media items with no exif processing state
  const { data: filesWithoutProcessingState, error: error1 } = await supabase
    .from('media_items')
    .select('*, file_types!inner(*), processing_states(*)')
    .eq('file_types.category', 'image')
    .eq('file_types.ignore', false)
    .is('processing_states', null)
    .limit(limit);

  if (error1) {
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

  // Get files with failed processing states
  const { data: filesWithNonSuccessState, error: error2 } = await supabase
    .from('media_items')
    .select('*, file_types!inner(*), processing_states!inner(*)')
    .eq('file_types.category', 'image')
    .eq('file_types.ignore', false)
    .eq('processing_states.type', 'exif')
    .eq('processing_states.status', 'failure')
    .limit(remainingLimit);

  if (error2) {
    // Still return what we got from the first query
    return filesWithoutProcessingState || [];
  }

  // Combine the results
  return [
    ...(filesWithoutProcessingState || []),
    ...(filesWithNonSuccessState || []),
  ];
}

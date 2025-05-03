'use server';

import fs from 'node:fs/promises';
import ExifReader from 'exifreader';
import type { Tags } from 'exifreader';
import sharp from 'sharp';
import { sanitizeExifData } from '@/lib/utils';
import type { Method } from '@/types/unified-stats';
import { createServerSupabaseClient } from './supabase';

/**
 * Extracts EXIF data using only the Sharp library
 */
async function extractMetadataWithSharp(
  filePath: string,
): Promise<Tags | null> {
  const metadata = await sharp(filePath).metadata();

  if (metadata.exif) {
    // Parse EXIF buffer from Sharp
    const tags = ExifReader.load(metadata.exif);
    return tags;
  }
  return null;
}

/**
 * Extracts EXIF data using only direct extraction with exifReader
 */
async function extractMetadataDirectOnly(
  filePath: string,
): Promise<{ tags: Tags | null; thumbnailBuffer?: Buffer }> {
  const tags = await ExifReader.load(filePath);

  // Check if there's a thumbnail in the EXIF data
  let thumbnailBuffer: Buffer | undefined = undefined;
  if (tags.Thumbnail?.base64) {
    // Extract the thumbnail buffer
    thumbnailBuffer = Buffer.from(tags.Thumbnail.base64, 'base64');
  }

  return { tags, thumbnailBuffer };
}

/**
 * Extracts EXIF data using only marker-based extraction
 */
async function extractMetadataMarkerOnly(
  filePath: string,
): Promise<Tags | null> {
  const fileBuffer = await fs.readFile(filePath);
  // JPEG files typically have EXIF data starting after the APP1 marker (0xFFE1)
  const app1Marker = Buffer.from([0xff, 0xe1]);
  const markerIndex = fileBuffer.indexOf(app1Marker);

  if (markerIndex !== -1) {
    // Extract EXIF data block - skip the marker (2 bytes) and length (2 bytes)
    const exifBlock = fileBuffer.slice(markerIndex + 4);
    return ExifReader.load(exifBlock);
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
  method: Method;
}): Promise<{
  success: boolean;
  data: Tags | null;
  error?: string;
  thumbnailBuffer?: Buffer;
}> {
  try {
    // First check if the file exists
    try {
      await fs.access(filePath);
    } catch (accessError) {
      console.error(`File access error for ${filePath}:`, accessError);
      return {
        success: false,
        data: null,
        error: `File does not exist or is not accessible: ${filePath}`,
      };
    }

    // Choose extraction method based on parameter
    switch (method) {
      case 'direct-only':
        try {
          const result = await extractMetadataDirectOnly(filePath);
          return {
            success: true,
            data: result.tags,
            thumbnailBuffer: result.thumbnailBuffer,
          };
        } catch (err) {
          return {
            success: false,
            data: null,
            error: `Direct extraction error: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      case 'marker-only':
        try {
          const result = await extractMetadataMarkerOnly(filePath);
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            data: null,
            error: `Marker extraction error: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      case 'sharp-only':
        try {
          const result = await extractMetadataWithSharp(filePath);
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            data: null,
            error: `Sharp extraction error: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      default:
        // Try Sharp first, if it fails try direct extraction
        try {
          const sharpResult = await extractMetadataWithSharp(filePath);
          if (sharpResult) return { success: true, data: sharpResult };

          // If Sharp didn't find EXIF data, try direct extraction
          const directResult = await extractMetadataDirectOnly(filePath);
          return {
            success: true,
            data: directResult.tags,
            thumbnailBuffer: directResult.thumbnailBuffer,
          };
        } catch (_sharpError) {
          try {
            const directResult = await extractMetadataDirectOnly(filePath);
            return {
              success: true,
              data: directResult.tags,
              thumbnailBuffer: directResult.thumbnailBuffer,
            };
          } catch (directError) {
            return {
              success: false,
              data: null,
              error: `Both extraction methods failed: ${directError instanceof Error ? directError.message : String(directError)}`,
            };
          }
        }
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `Failed to extract EXIF data: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function extractAndSanitizeExifData(
  filePath: string,
  method: Method,
  progressCallback?: (message: string) => void,
): Promise<{
  success: boolean;
  exifData: Tags | null;
  sanitizedExifData: Tags | null;
  mediaDate: string | null;
  message: string;
  thumbnailBuffer?: Buffer;
}> {
  progressCallback?.(
    `Extracting metadata using ${method} method from ${filePath}`,
  );

  try {
    // Check if file exists before attempting extraction
    try {
      await fs.stat(filePath);
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

    const exifResult = await extractMetadata({
      filePath,
      method,
    });

    if (!exifResult.success || !exifResult.data) {
      return {
        success: false,
        exifData: null,
        sanitizedExifData: null,
        mediaDate: null,
        message: exifResult.error || 'No EXIF data found',
      };
    }

    // Import sanitizeExifData function
    progressCallback?.('Sanitizing EXIF data');

    // Sanitize EXIF data before storing it
    const sanitizedExifData = sanitizeExifData(exifResult.data);

    // Get media date from EXIF
    const mediaDate =
      exifResult.data?.DateTimeOriginal?.description ||
      exifResult.data?.DateTime?.description ||
      null;

    return {
      success: true,
      exifData: exifResult.data,
      sanitizedExifData,
      mediaDate,
      message: 'EXIF data extracted and sanitized successfully',
      thumbnailBuffer: exifResult.thumbnailBuffer,
    };
  } catch (error) {
    return {
      success: false,
      exifData: null,
      sanitizedExifData: null,
      mediaDate: null,
      message: `EXIF extraction error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Uploads a thumbnail buffer to Supabase storage
 * @param mediaId ID of the media item
 * @param thumbnailBuffer Buffer containing the thumbnail image
 * @returns Object containing success status, message, and thumbnail URL if successful
 */
export async function uploadExifThumbnail(
  mediaId: string,
  thumbnailBuffer: Buffer,
): Promise<{ success: boolean; thumbnailUrl?: string; message: string }> {
  try {
    const supabase = createServerSupabaseClient();

    // Process the thumbnail to ensure consistent format and quality
    const processedThumbnail = await sharp(thumbnailBuffer, {
      failOnError: false,
    })
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    // Upload to Supabase Storage
    const fileName = `${mediaId}_exif_thumb.webp`;

    const { error: storageError } = await supabase.storage
      .from('thumbnails')
      .upload(fileName, processedThumbnail, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (storageError) {
      return {
        success: false,
        message: `Failed to upload EXIF thumbnail: ${storageError.message}`,
      };
    }

    // Get the public URL for the uploaded thumbnail
    const { data: publicUrlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(fileName);

    const thumbnailUrl = publicUrlData.publicUrl;

    // Update the media_items table with the thumbnail path
    const { error: updateMediaItemError } = await supabase
      .from('media_items')
      .update({ thumbnail_path: thumbnailUrl })
      .eq('id', mediaId);

    if (updateMediaItemError) {
      // Attempt to delete the potentially orphaned thumbnail from storage
      await supabase.storage.from('thumbnails').remove([fileName]);

      return {
        success: false,
        message: `Uploaded thumbnail but failed to update media item record: ${updateMediaItemError.message}`,
      };
    }

    return {
      success: true,
      thumbnailUrl,
      message: 'EXIF thumbnail extracted, processed and stored successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: `Error processing or uploading EXIF thumbnail: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Helper function to get unprocessed files with a limit
export async function getUnprocessedFiles({ limit }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  try {
    // Only select the fields we actually need to process EXIF data
    // This reduces the size of the response significantly
    return await supabase
      .from('media_items')
      .select(
        `
        id, 
        file_name,
        file_path,
        file_type_id,
        file_types (
          id, 
          extension, 
          category, 
          ignore
        )
      `,
        {
          count: 'exact',
        },
      )
      // Only get image files that aren't ignored
      .eq('file_types.category', 'image')
      .is('file_types.ignore', false)
      .is('processing_states', null)
      .limit(limit);
  } catch (error) {
    console.error('Error fetching unprocessed files:', error);
    throw new Error(
      `Failed to fetch unprocessed files: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

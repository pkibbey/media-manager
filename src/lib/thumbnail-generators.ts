import fs from 'node:fs/promises';
import path from 'node:path';
import { exiftool } from 'exiftool-vendored';
import sharp from 'sharp';
import type { MediaWithRelations } from '@/types/media-types';
import { BACKGROUND_COLOR, THUMBNAIL_QUALITY, THUMBNAIL_SIZE } from './consts';
import { convertRawThumbnail, processRawWithDcraw } from './raw-processor';

/**
 * Generate thumbnail from a RAW file using primary dcraw method
 */
export async function generateRawThumbnailPrimary(
  mediaPath: string,
): Promise<Buffer> {
  // Use dcraw to extract high-quality JPEG from RAW file
  const rawBuffer = await processRawWithDcraw(mediaPath);

  // Resize to fit our thumbnail dimensions
  return sharp(rawBuffer)
    .rotate()
    .resize({
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      withoutEnlargement: true,
      fit: 'contain',
      background: BACKGROUND_COLOR,
    })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

/**
 * Generate thumbnail from a RAW file using fallback method
 */
export async function generateRawThumbnailFallback(
  mediaPath: string,
): Promise<Buffer> {
  const rawBuffer = await convertRawThumbnail(mediaPath);

  // Resize to fit our thumbnail dimensions
  return sharp(rawBuffer)
    .resize({
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      withoutEnlargement: true,
      fit: 'contain',
      background: BACKGROUND_COLOR,
    })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

/**
 * Extract embedded thumbnail from a file using ExifTool
 */
export async function extractExifThumbnail(mediaPath: string): Promise<Buffer> {
  const thumbnailId = Math.random().toString(36).substring(2);
  const tempThumbnailPath = path.join('/tmp', `${thumbnailId}.jpg`);

  // Extract embedded thumbnail using ExifTool
  await exiftool.extractThumbnail(mediaPath, tempThumbnailPath);

  // Read the thumbnail file
  const thumbnailBuffer = await fs.readFile(tempThumbnailPath);

  // Clean up temp file
  await fs.unlink(tempThumbnailPath);

  return thumbnailBuffer;
}

/**
 * Generate thumbnail directly with Sharp
 */
export async function generateSharpThumbnail(
  mediaPath: string,
): Promise<Buffer> {
  return sharp(mediaPath)
    .rotate()
    .resize({
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      withoutEnlargement: true,
      fit: 'contain',
      background: BACKGROUND_COLOR,
    })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

/**
 * Process RAW file with fallback strategies
 */
export async function processRawThumbnail(
  mediaItem: MediaWithRelations,
): Promise<Buffer> {
  try {
    return await generateRawThumbnailPrimary(mediaItem.media_path);
  } catch (_rawProcessError) {
    try {
      return await generateRawThumbnailFallback(mediaItem.media_path);
    } catch (_alternativeRawError) {
      throw new Error('All raw processing methods failed');
    }
  }
}

/**
 * Process native image file with fallback strategies
 */
export async function processNativeThumbnail(
  mediaItem: MediaWithRelations,
): Promise<Buffer> {
  try {
    return await extractExifThumbnail(mediaItem.media_path);
  } catch (extractError) {
    // Fallback to Sharp if ExifTool couldn't extract a thumbnail
    console.log(
      `Failed to extract thumbnail with ExifTool, using Sharp fallback: ${extractError}`,
    );
    return await generateSharpThumbnail(mediaItem.media_path);
  }
}

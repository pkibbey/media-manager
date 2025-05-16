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
  mediaItem: MediaWithRelations,
): Promise<Buffer | null> {
  // Use dcraw to extract high-quality JPEG from RAW file
  const rawBuffer = await processRawWithDcraw(mediaItem.media_path);

  if (!rawBuffer) {
    return null;
  }

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
  mediaItem: MediaWithRelations,
): Promise<Buffer | null> {
  const rawBuffer = await convertRawThumbnail(mediaItem.media_path);

  if (!rawBuffer) {
    return null;
  }

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
  mediaItem: MediaWithRelations,
): Promise<Buffer> {
  return sharp(mediaItem.media_path)
    .rotate(mediaItem.exif_data?.orientation || 0)
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
): Promise<Buffer | null> {
  try {
    return await generateRawThumbnailPrimary(mediaItem);
  } catch (_rawProcessError) {
    try {
      return await generateRawThumbnailFallback(mediaItem);
    } catch (_alternativeRawError) {
      return null;
    }
  }
}

/**
 * Process native image file with fallback strategies
 */
export async function processNativeThumbnail(
  mediaItem: MediaWithRelations,
): Promise<Buffer | null> {
  try {
    return await generateSharpThumbnail(mediaItem);
  } catch (_alternativeRawError) {
    return null;
  }
}

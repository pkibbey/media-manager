import sharp from 'sharp';
import type { MediaWithRelations } from '@/types/media-types';
import { BACKGROUND_COLOR, THUMBNAIL_QUALITY, THUMBNAIL_SIZE } from './consts';
import { processRawWithDcraw } from './raw-processor';

/**
 * Generate thumbnail from a RAW file using primary dcraw method
 */
async function generateRawThumbnailPrimary(
  mediaItem: MediaWithRelations,
): Promise<Buffer | null> {
  // Use dcraw to extract high-quality JPEG from RAW file
  const rawBuffer = await processRawWithDcraw(mediaItem.media_path);
  console.log('rawBuffer: ', rawBuffer);

  if (!rawBuffer) {
    throw new Error('Failed to process RAW file with dcraw');
  }

  console.log('Primary RAW thumbnail generation successful');

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
 * Generate thumbnail directly with Sharp
 */
async function generateSharpThumbnail(
  mediaItem: MediaWithRelations,
): Promise<Buffer> {
  try {
    const result = await sharp(mediaItem.media_path)
      .rotate(orientationToDegrees(mediaItem.exif_data?.orientation))
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        withoutEnlargement: true,
        fit: 'contain',
        background: BACKGROUND_COLOR,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();
    return result;
  } catch (error) {
    console.error('Error generating thumbnail with Sharp:', error);
    throw new Error('Failed to generate thumbnail with Sharp');
  }
}

/**
 * Process RAW file with fallback strategies
 */
export async function processRawThumbnail(
  mediaItem: MediaWithRelations,
): Promise<Buffer | null> {
  try {
    console.log('try generating with dcraw: ');
    return await generateRawThumbnailPrimary(mediaItem);
  } catch (_rawProcessError) {
    console.log('_rawProcessError: ', _rawProcessError);
    try {
      console.log('Falling back to generateSharpThumbnail');
      return await generateSharpThumbnail(mediaItem);
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

function orientationToDegrees(orientation?: number | null): number {
  switch (orientation) {
    case 3:
      return 180;
    case 6:
      return 90;
    case 8:
      return 270;
    default:
      return 0;
  }
}

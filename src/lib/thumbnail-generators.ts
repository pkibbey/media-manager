import sharp from 'sharp';
import type { MediaWithRelations } from '@/types/media-types';
import { BACKGROUND_COLOR, THUMBNAIL_QUALITY, THUMBNAIL_SIZE } from './consts';
import { processRawWithDcraw } from './raw-processor';

/**
 * Represents the result of thumbnail generation.
 * thumbnailBuffer: Buffer containing the thumbnail image.
 * imageFingerprint: Buffer containing a raw image fingerprint (e.g., for pHash), or null if not generated.
 */
export type ThumbnailGenerationResult = {
	thumbnailBuffer: Buffer;
	imageFingerprint: Buffer | null;
};

/**
 * Generate thumbnail from a RAW file using primary dcraw method
 */
async function generateRawThumbnailPrimary(
	fileBuffer: Buffer,
): Promise<ThumbnailGenerationResult | null> {
	// Use dcraw to extract high-quality JPEG from RAW file
	const rawBuffer = await processRawWithDcraw(fileBuffer);

	if (!rawBuffer) {
		throw new Error('Failed to process RAW file with dcraw');
	}

	const sharpInstance = sharp(rawBuffer).rotate();

	// Resize to fit our thumbnail dimensions
	const thumbnailBuffer = await sharpInstance
		.clone()
		.resize({
			width: THUMBNAIL_SIZE,
			height: THUMBNAIL_SIZE,
			withoutEnlargement: true,
			fit: 'contain',
			background: BACKGROUND_COLOR,
		})
		.jpeg({ quality: THUMBNAIL_QUALITY })
		.toBuffer();

	// Generate a small, grayscale, raw pixel buffer for fingerprinting/hashing
	const imageFingerprint = await sharpInstance
		.clone()
		.greyscale()
		.resize(16, 16, { fit: 'fill' }) // Small, fixed size
		.raw()
		.toBuffer();

	return { thumbnailBuffer, imageFingerprint };
}

/**
 * Generate thumbnail directly with Sharp and create an image fingerprint
 */
async function generateSharpThumbnail(
	mediaItem: MediaWithRelations,
	fileBuffer: Buffer,
): Promise<ThumbnailGenerationResult> {
	try {
		const sharpInstance = sharp(fileBuffer).rotate(
			orientationToDegrees(mediaItem.exif_data?.orientation),
		);

		const thumbnailBuffer = await sharpInstance
			.clone() // Clone the instance for thumbnail generation
			.resize({
				width: THUMBNAIL_SIZE,
				height: THUMBNAIL_SIZE,
				withoutEnlargement: true,
				fit: 'contain',
				background: BACKGROUND_COLOR,
			})
			.jpeg({ quality: THUMBNAIL_QUALITY })
			.toBuffer();

		// Generate a small, grayscale, raw pixel buffer for fingerprinting/hashing
		const imageFingerprint = await sharpInstance
			.clone() // Clone the instance again for fingerprint generation
			.greyscale()
			.resize(16, 16, { fit: 'fill' }) // Small, fixed size
			.raw()
			.toBuffer();

		return { thumbnailBuffer, imageFingerprint };
	} catch (_error) {
		throw new Error('Failed to generate thumbnail or fingerprint with Sharp');
	}
}

/**
 * Process RAW file with fallback strategies
 */
export async function processRawThumbnail(
	mediaItem: MediaWithRelations,
	fileBuffer: Buffer,
): Promise<ThumbnailGenerationResult | null> {
	try {
		return await generateRawThumbnailPrimary(fileBuffer);
	} catch (_rawProcessError) {
		try {
			return await generateSharpThumbnail(mediaItem, fileBuffer);
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
	fileBuffer: Buffer,
): Promise<ThumbnailGenerationResult | null> {
	try {
		return await generateSharpThumbnail(mediaItem, fileBuffer);
	} catch (_sharpError) {
		// Error is already logged in generateSharpThumbnail
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

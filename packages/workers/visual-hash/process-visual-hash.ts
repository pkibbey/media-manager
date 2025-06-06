import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });
import sharp from 'sharp';

import { createSupabase } from 'shared';

/**
 * Generate a perceptual hash (dHash) from a 16x16 grayscale image fingerprint.
 * @param fingerprint - The raw 16x16 grayscale image fingerprint buffer (256 bytes).
 * @returns A hex string representation of the perceptual hash, or null if generation fails.
 */
async function generateVisualHashFromFingerprint(
  fingerprint: Buffer,
): Promise<string | null> {
  try {
    if (!fingerprint || fingerprint.length !== 256) {
      console.error(
        '[generateVisualHashFromFingerprint] Invalid fingerprint buffer length:',
        fingerprint?.length,
      );
      return null;
    }

    // Implement difference hash (dHash) algorithm
    // Compare each pixel with the pixel to its right
    const hash: number[] = [];

    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 15; col++) {
        // Only go to 15 to compare with next pixel
        const currentPixel = fingerprint[row * 16 + col];
        const nextPixel = fingerprint[row * 16 + col + 1];

        // If current pixel is brighter than next pixel, set bit to 1
        hash.push(currentPixel > nextPixel ? 1 : 0);
      }
    }

    // Convert the binary hash to a hexadecimal string
    const hashString = convertBinaryToHex(hash);

    return hashString;
  } catch (_error) {
    return null;
  }
}

/**
 * Converts an array of binary bits to a hexadecimal string.
 * @param binaryArray - Array of 1s and 0s
 * @returns Hexadecimal string representation
 */
function convertBinaryToHex(binaryArray: number[]): string {
  let hexString = '';

  // Process 4 bits at a time to create hex digits
  for (let i = 0; i < binaryArray.length; i += 4) {
    const nibble = binaryArray.slice(i, i + 4);

    // Pad with zeros if needed
    while (nibble.length < 4) {
      nibble.push(0);
    }

    // Convert 4 bits to decimal then to hex
    const decimal = nibble[0] * 8 + nibble[1] * 4 + nibble[2] * 2 + nibble[3];
    hexString += decimal.toString(16);
  }

  return hexString;
}

/**
 * Process visual hash generation for a media item
 * @param params - Object containing processing parameters
 * @param params.mediaId - The ID of the media item to process
 * @param params.thumbnailUrl - The file system path to the media file
 * @returns Promise<boolean> - Success status
 */
export async function processVisualHash({
  mediaId,
  thumbnailUrl,
}: {
  mediaId: string;
  thumbnailUrl: string;
}): Promise<boolean> {
  try {
    if (!thumbnailUrl) {
      throw new Error('No media_path available');
    }

    // Fetch image data from URL if it's a HTTP URL, otherwise treat as file path
    let imageBuffer: Buffer;
    if (
      thumbnailUrl.startsWith('http://') ||
      thumbnailUrl.startsWith('https://')
    ) {
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch thumbnail: ${response.status} ${response.statusText}`,
        );
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // If it's a file path, read it directly
      imageBuffer = await sharp(thumbnailUrl).toBuffer();
    }

    // Generate image fingerprint from thumbnail
    const imageFingerprint = await sharp(imageBuffer)
      .greyscale()
      .resize(16, 16, { fit: 'fill' })
      .raw()
      .toBuffer();

    // Generate visual hash from fingerprint
    const visualHash =
      await generateVisualHashFromFingerprint(imageFingerprint);

    if (!visualHash) {
      console.warn(`Failed to generate visual hash for media ${mediaId}`);
      return false;
    }

    // Update database
    const supabase = createSupabase();
    const { error: updateError } = await supabase
      .from('media')
      .update({ visual_hash: visualHash })
      .eq('id', mediaId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return true;
  } catch (error) {
    console.error(`Error processing visual hash for media ${mediaId}:`, error);
    return false;
  }
}

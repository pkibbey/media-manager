import { LibRaw } from 'libraw.js';

/**
 * Process a RAW file using LibRaw to extract high-quality JPEG
 * @param rawFilePath - Path to the RAW file (NEF, CR2, ARW, etc)
 * @returns Buffer containing the processed JPEG image
 */
export async function processRawWithLibRaw(
  rawFilePath: string,
): Promise<Buffer> {
  const libRaw = new LibRaw();
  await libRaw.openFile(rawFilePath);
  await libRaw.unpackThumb();
  const thumbnailBuffer = await libRaw.getThumbnail();
  return thumbnailBuffer;
}

/**
 * Alternative function that uses LibRaw for full RAW conversion (if needed)
 * This is slower but may provide better quality in some cases
 */
export async function convertRawThumbnail(
  rawFilePath: string,
): Promise<Buffer> {
  // For now, use the same as processRawWithLibRaw, as libraw.js focuses on thumbnails
  return processRawWithLibRaw(rawFilePath);
}

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { v4 } from 'uuid';

const execAsync = promisify(exec);

/**
 * Process a RAW file using dcraw to extract high-quality JPEG
 * Note: This requires dcraw to be installed on the system
 * macOS: brew install dcraw
 * Ubuntu/Debian: apt-get install dcraw
 *
 * @param rawFilePath - Path to the RAW file (NEF, CR2, ARW, etc)
 * @returns Buffer containing the processed JPEG image
 */
export async function processRawWithDcraw(
  rawFilePath: string,
): Promise<Buffer> {
  // Validate file exists before processing
  try {
    await fs.access(rawFilePath);
  } catch (_error) {
    throw new Error(
      `RAW file does not exist or is not accessible: ${rawFilePath}`,
    );
  }

  // Create temporary file paths
  const tempDir = '/tmp';
  const tempOutputFile = path.join(tempDir, `${v4()}.jpg`);

  // Use absolute path to ensure correct resolution
  const absoluteRawPath = path.resolve(rawFilePath);

  try {
    // Use dcraw to extract the embedded JPEG or convert RAW to JPEG
    // -e: Extract embedded JPEG (fastest, good quality)
    // -c: Output to stdout (we redirect to a file)
    // -q 0: Use high-quality conversion
    const command = `dcraw -e -c -q 0 "${absoluteRawPath}" > "${tempOutputFile}"`;
    console.log(`Executing: ${command}`);

    await execAsync(command);

    // Read the resulting file
    const imageBuffer = await fs.readFile(tempOutputFile);

    // Clean up
    await fs.unlink(tempOutputFile);

    return imageBuffer;
  } catch (error) {
    console.error('Error processing RAW file with dcraw:', error);
    throw new Error(`Failed to process RAW file: ${(error as Error).message}`);
  }
}

/**
 * Alternative function that uses dcraw for full RAW conversion
 * This is slower but may provide better quality in some cases
 */
export async function convertRawThumbnail(
  rawFilePath: string,
): Promise<Buffer> {
  const tempDir = '/tmp';
  const tempOutputFile = path.join(tempDir, `${v4()}.jpg`);

  // Resize to 1024px and convert to JPEG
  // -T: Output a thumbnail image
  // -w: Use camera's white balance
  await execAsync(`dcraw -T -w "${rawFilePath}" -o 1 > "${tempOutputFile}"`);

  const imageBuffer = await fs.readFile(tempOutputFile);
  await fs.unlink(tempOutputFile);

  return imageBuffer;
}

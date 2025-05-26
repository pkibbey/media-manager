import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { v4 } from 'uuid';

const execAsync = promisify(exec);

/**
 * Process a RAW file using dcraw to extract high-quality JPEG
 * Accepts a Buffer, writes it to a temp file, and processes it.
 * @param rawBuffer - Buffer containing the RAW file data
 * @returns Buffer containing the processed JPEG image
 */
export async function processRawWithDcraw(
  rawBuffer: Buffer,
): Promise<Buffer | null> {
  // Write buffer to a temp file
  const tempDir = '/tmp';
  const tempInputFile = path.join(tempDir, `${v4()}`);
  const tempOutputFile = path.join(tempDir, `${v4()}.jpg`);
  try {
    await fs.writeFile(tempInputFile, rawBuffer);
  } catch (_error) {
    return null;
  }

  try {
    // Use dcraw to extract the embedded JPEG or convert RAW to JPEG
    // -e: Extract embedded JPEG (fastest, good quality)
    // -c: Output to stdout (we redirect to a file)
    // -q 0: Use high-quality conversion
    const command = `dcraw -e -c -q 0 "${tempInputFile}" > "${tempOutputFile}"`;
    // Capture stderr for diagnostics
    await execAsync(command).catch((err) => {
      // Log error and stderr if dcraw fails
      console.error(
        '[processRawWithDcraw] dcraw failed:',
        err.stderr || err.message,
      );
      throw err;
    });
    // Check output file exists and is not empty
    let imageBuffer: Buffer | null = null;
    try {
      const stat = await fs.stat(tempOutputFile);
      if (stat.size > 0) {
        imageBuffer = await fs.readFile(tempOutputFile);
      } else {
        console.error(
          '[processRawWithDcraw] Output JPEG is empty:',
          tempOutputFile,
        );
      }
    } catch (statErr) {
      console.error(
        '[processRawWithDcraw] Could not stat/read output JPEG:',
        statErr,
      );
    }
    // Clean up
    await fs.unlink(tempInputFile);
    await fs.unlink(tempOutputFile);
    return imageBuffer;
  } catch (_error) {
    // Clean up temp input file if output failed
    try {
      await fs.unlink(tempInputFile);
    } catch {}
    try {
      await fs.unlink(tempOutputFile);
    } catch {}
    return null;
  }
}

/**
 * Alternative function that uses dcraw for full RAW conversion
 * Accepts a Buffer, writes it to a temp file, and processes it.
 * This is slower but may provide better quality in some cases
 */
export async function convertRawThumbnail(
  rawBuffer: Buffer,
): Promise<Buffer | null> {
  const tempDir = '/tmp';
  const tempInputFile = path.join(tempDir, `${v4()}`);
  const tempOutputFile = path.join(tempDir, `${v4()}.jpg`);
  try {
    await fs.writeFile(tempInputFile, rawBuffer);
    // Resize to 1024px and convert to JPEG
    // -T: Output a thumbnail image
    // -w: Use camera's white balance
    const command = `dcraw -T -w "${tempInputFile}" -o 1 > "${tempOutputFile}"`;
    await execAsync(command);
    const imageBuffer = await fs.readFile(tempOutputFile);
    await fs.unlink(tempInputFile);
    await fs.unlink(tempOutputFile);
    return imageBuffer;
  } catch (_error) {
    try {
      await fs.unlink(tempInputFile);
    } catch {}
    try {
      await fs.unlink(tempOutputFile);
    } catch {}
    return null;
  }
}

'use server';

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';

/**
 * Convert a HEIC image to JPEG using ImageMagick or native sips (macOS)
 */
export async function convertHeicToJpeg(
  inputPath: string,
  tempOutputPath: string,
): Promise<Buffer> {
  try {
    const execAsync = promisify(exec);

    // First try ImageMagick (requires it to be installed)
    try {
      await execAsync(`magick "${inputPath}" "${tempOutputPath}"`);
      return fs.readFile(tempOutputPath);
    } catch (magickError) {
      console.error('[Thumbnail] ImageMagick conversion failed:', magickError);

      // Try with sips if on macOS
      if (process.platform === 'darwin') {
        try {
          await execAsync(
            `sips -s format jpeg "${inputPath}" --out "${tempOutputPath}"`,
          );
          return fs.readFile(tempOutputPath);
        } catch (sipsError) {
          console.error('[Thumbnail] sips conversion failed:', sipsError);
          throw new Error('macOS sips command failed to convert HEIC image');
        }
      } else {
        throw new Error(
          'ImageMagick failed and sips is only available on macOS',
        );
      }
    }
  } catch (error) {
    console.error('[Thumbnail] All HEIC conversion methods failed:', error);
    throw new Error(
      `Failed to convert HEIC image: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure ImageMagick is installed correctly.`,
    );
  } finally {
    // Clean up temporary file if it exists
    try {
      await fs.access(tempOutputPath);
      await fs.unlink(tempOutputPath);
    } catch (error) {
      console.error(error);
    }
  }
}

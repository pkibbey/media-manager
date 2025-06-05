'use server';

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { createSupabase } from 'shared';
import { IMAGE_DETAIL_SIZE, THUMBNAIL_QUALITY } from 'shared/consts';
import sharp from 'sharp';
import { v4 } from 'uuid';

const execAsync = promisify(exec);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createSupabase();

  try {
    // Get media details from database
    const { data: mediaItem, error: mediaError } = await supabase
      .from('media')
      .select(`
        media_path,
        media_types ( mime_type, is_native )
      `)
      .eq('id', id)
      .single();

    if (mediaError || !mediaItem || !mediaItem.media_path) {
      console.error(`Media not found or invalid for ID: ${id}`);
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const filePath = mediaItem.media_path;
    const isRawFormat = mediaItem.media_types.is_native === false;

    let imageBuffer: Buffer | null = null;

    // Process image based on type
    if (isRawFormat) {
      // Handle RAW image format with fallback chain
      try {
        const rawFileBuffer = await fs.readFile(filePath);

        // Try dcraw first, then fallback to thumbnail extraction
        imageBuffer = await processRawWithDcraw(rawFileBuffer);
        if (!imageBuffer || !isValidImageBuffer(imageBuffer)) {
          imageBuffer = await convertRawThumbnail(rawFileBuffer);
        }

        // Final validation
        if (!imageBuffer || !isValidImageBuffer(imageBuffer)) {
          throw new Error('All RAW processing methods failed');
        }
      } catch (_error) {
        console.error(`Failed to process RAW image: ${filePath}`);
        return NextResponse.json(
          { error: 'Failed to process image' },
          { status: 500 },
        );
      }
    } else {
      // Handle standard image format
      try {
        imageBuffer = await fs.readFile(filePath);

        // Validate the image buffer
        if (!isValidImageBuffer(imageBuffer)) {
          throw new Error('Invalid image file');
        }
      } catch (_error) {
        console.error(`Failed to read file: ${filePath}`);
        return NextResponse.json(
          { error: 'Failed to read image file' },
          { status: 500 },
        );
      }
    }

    if (!imageBuffer) {
      console.error(`Image buffer is null for ID: ${id}`);
      return NextResponse.json(
        { error: 'Failed to process image' },
        { status: 500 },
      );
    }

    // Create thumbnail from image buffer with error handling
    try {
      const thumbnailBuffer = await sharp(imageBuffer)
        .rotate() // Apply EXIF rotation
        .resize({
          width: IMAGE_DETAIL_SIZE,
          withoutEnlargement: true,
        })
        .jpeg({ quality: THUMBNAIL_QUALITY })
        .toBuffer();

      // Return the image
      return new NextResponse(thumbnailBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Length': thumbnailBuffer.length.toString(),
        },
      });
    } catch (sharpError) {
      console.error(`Sharp processing failed for ID: ${id}`, sharpError);
      return NextResponse.json(
        { error: 'Failed to process image with Sharp' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Process a RAW file using dcraw to extract high-quality JPEG
 * Accepts a Buffer, writes it to a temp file, and processes it.
 * @param rawBuffer - Buffer containing the RAW file data
 * @returns Buffer containing the processed JPEG image
 */
async function processRawWithDcraw(rawBuffer: Buffer): Promise<Buffer | null> {
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
    await execAsync(command);
    const imageBuffer = await fs.readFile(tempOutputFile);
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
async function convertRawThumbnail(rawBuffer: Buffer): Promise<Buffer | null> {
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

/**
 * Validates if a buffer contains a valid image by checking basic structure
 * @param buffer - Buffer to validate
 * @returns boolean indicating if buffer appears to be a valid image
 */
function isValidImageBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 10) {
    return false;
  }

  // Check for common image file signatures
  const header = buffer.subarray(0, 10);

  // JPEG signatures
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    // Check for proper JPEG end marker in last few bytes
    const tail = buffer.subarray(-10);
    for (let i = 0; i < tail.length - 1; i++) {
      if (tail[i] === 0xff && tail[i + 1] === 0xd9) {
        return true;
      }
    }
    return false;
  }

  // PNG signature
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return true;
  }

  // TIFF signatures (used by some RAW processors)
  if (
    (header[0] === 0x49 &&
      header[1] === 0x49 &&
      header[2] === 0x2a &&
      header[3] === 0x00) ||
    (header[0] === 0x4d &&
      header[1] === 0x4d &&
      header[2] === 0x00 &&
      header[3] === 0x2a)
  ) {
    return true;
  }

  return false;
}

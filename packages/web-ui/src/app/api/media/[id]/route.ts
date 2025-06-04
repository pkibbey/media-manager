'use server';

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { createSupabase } from 'shared';
import {
  BACKGROUND_COLOR,
  IMAGE_DETAIL_SIZE,
  THUMBNAIL_QUALITY,
} from 'shared/consts';
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
      // Handle RAW image format
      try {
        const rawFileBuffer = await fs.readFile(filePath);
        imageBuffer = await processRawWithDcraw(rawFileBuffer).catch(() =>
          convertRawThumbnail(rawFileBuffer),
        );
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

    // Create thumbnail from image buffer
    const thumbnailBuffer = await sharp(imageBuffer)
      .rotate() // Apply EXIF rotation
      .resize({
        width: IMAGE_DETAIL_SIZE,
        height: IMAGE_DETAIL_SIZE,
        withoutEnlargement: true,
        fit: 'contain',
        background: BACKGROUND_COLOR,
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

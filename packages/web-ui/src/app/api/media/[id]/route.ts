'use server';

import fs from 'node:fs/promises';
import { NextResponse } from 'next/server';
import {
  BACKGROUND_COLOR,
  IMAGE_DETAIL_SIZE,
  THUMBNAIL_QUALITY,
} from 'shared/consts';
import { convertRawThumbnail, processRawWithDcraw } from 'shared/raw-processor';
import { createSupabase } from 'shared/supabase';
import sharp from 'sharp';

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

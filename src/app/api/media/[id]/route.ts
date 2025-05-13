'use server';

import fs from 'node:fs/promises';
import { NextResponse } from 'next/server';
// import path from 'node:path'; // Not used
import sharp from 'sharp';
import {
  BACKGROUND_COLOR,
  IMAGE_DETAIL_SIZE,
  THUMBNAIL_QUALITY,
} from '@/lib/consts';
import { convertRawThumbnail, processRawWithDcraw } from '@/lib/raw-processor';
import { createSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/supabase';

// Helper function to check if a file is a Nikon NEF Raw file
function isNikonNef(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.nef');
}

export async function GET({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = createSupabase();

  if (!id) {
    return NextResponse.json({ error: 'Missing media ID' }, { status: 400 });
  }

  try {
    // Correctly define the type for mediaItem
    const { data: mediaItem, error: mediaError } = await supabase
      .from('media')
      .select(
        `
        exif_data ( width, height, orientation ),
        media_path,
        media_types ( mime_type )
      `,
      )
      .eq('id', id)
      .single();

    if (mediaError || !mediaItem) {
      return NextResponse.json(
        { error: `Media not found: ${mediaError?.message || 'No record'}` },
        { status: 404 },
      );
    }

    // Ensure media_types is correctly typed and accessed
    const mediaTypeRelation =
      mediaItem.media_types as Tables<'media_types'> | null;
    const mimeType = mediaTypeRelation?.mime_type;

    if (!mimeType) {
      return NextResponse.json(
        { error: 'MIME type not found for this item' },
        { status: 500 },
      );
    }

    const filePath = mediaItem.media_path;

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path not found for this item' },
        { status: 500 },
      );
    }

    let outputBuffer: Buffer;
    let contentType: string;

    if (isNikonNef(filePath)) {
      try {
        let rawProcessedBuffer: Buffer;
        try {
          // These functions take filePath and handle file reading internally
          rawProcessedBuffer = await processRawWithDcraw(filePath);
        } catch (dcrawError) {
          console.error(
            `Error with processRawWithDcraw for ${filePath}, trying convertRawThumbnail:`,
            dcrawError,
          );
          rawProcessedBuffer = await convertRawThumbnail(filePath); // Fallback
        }
        // Convert the processed RAW buffer to JPEG, applying EXIF rotation
        outputBuffer = await sharp(rawProcessedBuffer)
          .rotate()
          .jpeg()
          .toBuffer();
        contentType = 'image/jpeg';
      } catch (rawProcessingError) {
        console.error(
          `Error processing NEF file ${filePath}:`,
          rawProcessingError,
        );
        return NextResponse.json(
          { error: 'Error processing RAW image file' },
          { status: 500 },
        );
      }
    } else {
      // For non-NEF files, read the file into a buffer first
      let imageBuffer: Buffer;
      try {
        imageBuffer = await fs.readFile(filePath);
      } catch (e) {
        console.error(`Error reading file ${filePath}:`, e);
        return NextResponse.json(
          { error: 'Error reading media file' },
          { status: 500 },
        );
      }

      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        outputBuffer = imageBuffer;
        contentType = 'image/jpeg';
      } else {
        // Convert other non-JPEG images to JPEG, applying EXIF rotation
        try {
          outputBuffer = await sharp(imageBuffer).rotate().jpeg().toBuffer();
          contentType = 'image/jpeg';
        } catch (conversionError) {
          console.error(
            `Error converting image ${filePath} to JPEG:`,
            conversionError,
          );
          return NextResponse.json(
            { error: 'Error converting image' },
            { status: 500 },
          );
        }
      }
    }

    // Resize to fit thumbnail dimensions
    const thumbnailBuffer = await sharp(outputBuffer)
      .resize({
        width: IMAGE_DETAIL_SIZE,
        height: IMAGE_DETAIL_SIZE,
        withoutEnlargement: true,
        fit: 'contain',
        background: BACKGROUND_COLOR,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    return new NextResponse(thumbnailBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': outputBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

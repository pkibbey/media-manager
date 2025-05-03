import fsSync from 'node:fs';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import { lookup } from 'mime-types';
import { type NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getMediaItemById } from '@/actions/media/get-media-item-by-id';
import { isImage, isVideo, needsConversion } from '@/lib/utils';

// Cache directory for converted files
const CACHE_DIR = path.join(process.cwd(), '.cache');

// Ensure cache directory exists
try {
  if (!fsSync.existsSync(CACHE_DIR)) {
    fsSync.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create cache directory:', error);
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  // const thumbnail = request.nextUrl.searchParams.get('thumbnail') === 'true'; // REMOVED

  if (!id) {
    return NextResponse.json({ error: 'Missing media id' }, { status: 400 });
  }

  try {
    // Get the media item by ID
    const { data: mediaItem, error } = await getMediaItemById(id);

    if (error || !mediaItem) {
      console.error('Error fetching media item:', error);
      return NextResponse.json(
        { error: 'Media item not found' },
        { status: 404 },
      );
    }

    // Check if file exists
    try {
      await fs.access(mediaItem.file_path);
    } catch (error) {
      console.error('File not found on disk:', mediaItem.file_path, error);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 },
      );
    }

    // Get the file extension
    const fileExtension = path
      .extname(mediaItem.file_path)
      .substring(1)
      .toLowerCase();

    const requiresConversion = await needsConversion(mediaItem.file_type_id);
    const isImageFile = await isImage(mediaItem.file_type_id);
    const isVideoFile = await isVideo(mediaItem.file_type_id);
    const mimeType = lookup(fileExtension) || 'application/octet-stream';

    // If no conversion needed, serve the original file
    if (!requiresConversion) {
      const fileData = await fs.readFile(mediaItem.file_path);

      return new NextResponse(fileData, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(mediaItem.file_name)}"`,
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        },
      });
    }

    // Handle conversion for files that need it
    const cachedFilePath = path.join(
      CACHE_DIR,
      `${id}_converted.${isImageFile ? 'webp' : 'mp4'}`,
    );

    try {
      // Check if converted file already exists in cache
      await fs.access(cachedFilePath);
      const convertedData = await fs.readFile(cachedFilePath);

      return new NextResponse(convertedData, {
        headers: {
          'Content-Type': isImageFile ? 'image/webp' : 'video/mp4',
          'Content-Disposition': `inline; filename="${encodeURIComponent(mediaItem.file_name)}.${isImageFile ? 'webp' : 'mp4'}"`,
          'Cache-Control': 'public, max-age=604800', // Cache for 7 days
        },
      });
    } catch (error) {
      console.error(
        'Converted file not found in cache, performing conversion:',
        error,
      );
      // Converted file doesn't exist in cache, perform conversion
      if (isImageFile) {
        try {
          const webpBuffer = await sharp(mediaItem.file_path)
            .webp({ quality: 85 })
            .toBuffer();

          // Save to cache asynchronously
          fs.writeFile(cachedFilePath, webpBuffer).catch((err) =>
            console.error('Failed to cache converted image:', err),
          );

          return new NextResponse(webpBuffer, {
            headers: {
              'Content-Type': 'image/webp',
              'Content-Disposition': `inline; filename="${encodeURIComponent(mediaItem.file_name)}.webp"`,
              'Cache-Control': 'public, max-age=604800', // Cache for 7 days
            },
          });
        } catch (err) {
          console.error('Error converting image:', err);
          return NextResponse.json(
            { error: 'Error converting image' },
            { status: 500 },
          );
        }
      } else if (isVideoFile) {
        // Video conversion logic (unchanged)
        return new Promise((resolve) => {
          const tempOutputPath = path.join(tmpdir(), `${id}_${Date.now()}.mp4`);
          ffmpeg(mediaItem.file_path)
            .outputFormat('mp4')
            .videoCodec('libx264')
            .audioCodec('aac')
            .on('end', async () => {
              try {
                // Copy to cache for future requests
                await fs.copyFile(tempOutputPath, cachedFilePath);

                // Stream the file back to the client
                const fileStream = createReadStream(tempOutputPath);
                const chunks: Buffer[] = [];

                fileStream.on('data', (chunk) => {
                  if (Buffer.isBuffer(chunk)) {
                    chunks.push(chunk);
                  } else {
                    chunks.push(Buffer.from(chunk));
                  }
                });
                fileStream.on('end', () => {
                  const videoBuffer = Buffer.concat(chunks);

                  // Clean up the temporary file
                  fs.unlink(tempOutputPath).catch(console.error);

                  resolve(
                    new NextResponse(videoBuffer, {
                      headers: {
                        'Content-Type': 'video/mp4',
                        'Content-Disposition': `inline; filename="${encodeURIComponent(mediaItem.file_name)}.mp4"`,
                        'Cache-Control': 'public, max-age=604800', // Cache for 7 days
                      },
                    }),
                  );
                });

                fileStream.on('error', (err) => {
                  console.error('Error reading converted video:', err);
                  resolve(
                    NextResponse.json(
                      { error: 'Error reading converted video' },
                      { status: 500 },
                    ),
                  );
                });
              } catch (err) {
                console.error('Error handling converted video:', err);
                resolve(
                  NextResponse.json(
                    { error: 'Error handling converted video' },
                    { status: 500 },
                  ),
                );
              }
            })
            .on('error', (err) => {
              console.error('Error converting video:', err);
              resolve(
                NextResponse.json(
                  { error: 'Error converting video' },
                  { status: 500 },
                ),
              );
            })
            .save(tempOutputPath);
        });
      }

      // Fallback for unsupported conversion or other errors
      console.warn(
        `Unsupported conversion or error for file type: ${fileExtension}, serving original.`,
      );
      const fileData = await fs.readFile(mediaItem.file_path);

      return new NextResponse(fileData, {
        headers: {
          'Content-Type': mimeType, // Use the determined mimeType
          'Content-Disposition': `inline; filename="${encodeURIComponent(mediaItem.file_name)}"`,
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        },
      });
    }
  } catch (error: any) {
    console.error('Error serving media file:', error);
    return NextResponse.json(
      { error: 'Error serving media file' },
      { status: 500 },
    );
  }
}

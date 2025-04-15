import { createReadStream } from 'node:fs';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServerSupabaseClient } from '@/lib/supabase';
import { needsConversion } from '@/lib/utils';
import ffmpeg from 'fluent-ffmpeg';
import { lookup } from 'mime-types';
import { type NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

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
  const thumbnail = request.nextUrl.searchParams.get('thumbnail') === 'true';

  if (!id) {
    return NextResponse.json({ error: 'Missing media id' }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Get the media item by ID
    const { data: mediaItem, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', id)
      .single();

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
      console.error('File not found on disk:', mediaItem.file_path);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 },
      );
    }

    // Get the file extension and determine if conversion is needed
    const fileExtension = path
      .extname(mediaItem.file_path)
      .substring(1)
      .toLowerCase();
    const requiresConversion =
      mediaItem.needs_conversion || needsConversion(fileExtension);
    const isImage = mediaItem.type === 'image';
    const isVideo = mediaItem.type === 'video';

    // Handle thumbnails (always convert to webp for efficiency)
    if (thumbnail) {
      const cachedThumbnailPath = path.join(CACHE_DIR, `${id}_thumb.webp`);

      try {
        // Check if thumbnail already exists in cache
        await fs.access(cachedThumbnailPath);
        const thumbnailData = await fs.readFile(cachedThumbnailPath);

        return new NextResponse(thumbnailData, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=604800', // Cache for 7 days
          },
        });
      } catch (error) {
        // Thumbnail doesn't exist in cache, generate it
        if (isImage) {
          try {
            const thumbnailBuffer = await sharp(mediaItem.file_path)
              .resize(300, 300, { fit: 'cover' })
              .webp({ quality: 80 })
              .toBuffer();

            // Save to cache asynchronously
            fs.writeFile(cachedThumbnailPath, thumbnailBuffer).catch((err) =>
              console.error('Failed to cache thumbnail:', err),
            );

            return new NextResponse(thumbnailBuffer, {
              headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=604800', // Cache for 7 days
              },
            });
          } catch (err) {
            console.error('Error generating image thumbnail:', err);
          }
        }

        if (isVideo) {
          // For videos, we'll use a placeholder thumbnail
          // In a future update, actual video thumbnails could be extracted
          const placeholderThumbnail = await fs
            .readFile(
              path.join(process.cwd(), 'public', 'video-placeholder.png'),
            )
            .catch(() => null);

          if (placeholderThumbnail) {
            return new NextResponse(placeholderThumbnail, {
              headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=604800', // Cache for 7 days
              },
            });
          }
        }

        // If all else fails, return a 404
        return NextResponse.json(
          { error: 'Cannot generate thumbnail' },
          { status: 404 },
        );
      }
    }

    // If no conversion needed, serve the original file
    if (!requiresConversion) {
      const mimeType = lookup(fileExtension) || 'application/octet-stream';
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
      `${id}_converted.${isImage ? 'webp' : 'mp4'}`,
    );

    try {
      // Check if converted file already exists in cache
      await fs.access(cachedFilePath);
      const convertedData = await fs.readFile(cachedFilePath);

      return new NextResponse(convertedData, {
        headers: {
          'Content-Type': isImage ? 'image/webp' : 'video/mp4',
          'Content-Disposition': `inline; filename="${encodeURIComponent(mediaItem.file_name)}.${isImage ? 'webp' : 'mp4'}"`,
          'Cache-Control': 'public, max-age=604800', // Cache for 7 days
        },
      });
    } catch (error) {
      // Converted file doesn't exist in cache, perform conversion
      if (isImage) {
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
      } else if (isVideo) {
        return new Promise((resolve) => {
          // For video conversion, this would be a time-consuming process
          // In a real implementation, you would want to use a queue system
          // Here's a minimal implementation for demonstration purposes

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

      // If we can't convert the file, try returning the original as a fallback
      console.warn(`Unsupported conversion for file type: ${fileExtension}`);
      const mimeType = lookup(fileExtension) || 'application/octet-stream';
      const fileData = await fs.readFile(mediaItem.file_path);

      return new NextResponse(fileData, {
        headers: {
          'Content-Type': mimeType,
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

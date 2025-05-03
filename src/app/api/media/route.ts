import fsSync from 'node:fs';
import { createReadStream, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import { lookup } from 'mime-types';
import { type NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getMediaItemById } from '@/actions/media/get-media-item-by-id';

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

    // Get file type information directly from the database
    const fileType = mediaItem.file_types;

    if (!fileType) {
      return NextResponse.json(
        { error: 'File type information not found' },
        { status: 500 },
      );
    }

    const isImageFile = fileType.category === 'image';
    const isVideoFile = fileType.category === 'video';
    const requiresConversion = fileType.needs_conversion === true;
    const mimeType = lookup(fileExtension) || 'application/octet-stream';

    // Get the Range header for streaming support
    const rangeHeader = request.headers.get('range');

    // If no conversion needed
    if (!requiresConversion) {
      // For videos, handle range requests to enable streaming
      if (isVideoFile && rangeHeader) {
        return streamVideoFile(
          mediaItem.file_path,
          rangeHeader,
          mimeType,
          mediaItem.file_name,
        );
      }

      // For other files or when no range header, serve the entire file
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

      // If it's a video and we have a range header, stream it
      if (isVideoFile && rangeHeader) {
        return streamVideoFile(
          cachedFilePath,
          rangeHeader,
          'video/mp4',
          `${mediaItem.file_name}.mp4`,
        );
      }
      // Otherwise serve the entire file
      const convertedData = await fs.readFile(cachedFilePath);
      return new NextResponse(convertedData, {
        headers: {
          'Content-Type': isImageFile ? 'image/webp' : 'video/mp4',
          'Content-Disposition': `inline; filename="${encodeURIComponent(mediaItem.file_name)}.${isImageFile ? 'webp' : 'mp4'}"`,
          'Cache-Control': 'public, max-age=604800', // Cache for 7 days
        },
      });
    } catch (_error) {
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
          return NextResponse.json(
            { error: `Error converting image - ${err}` },
            { status: 500 },
          );
        }
      } else if (isVideoFile) {
        // Video conversion logic
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

                // If we have a range header, stream the converted file
                if (rangeHeader) {
                  resolve(
                    streamVideoFile(
                      cachedFilePath,
                      rangeHeader,
                      'video/mp4',
                      `${mediaItem.file_name}.mp4`,
                    ),
                  );
                  // Clean up the temporary file asynchronously
                  fs.unlink(tempOutputPath).catch(console.error);
                } else {
                  // If no range request, read the entire file and send it
                  const fileBuffer = await fs.readFile(tempOutputPath);

                  // Clean up the temporary file
                  fs.unlink(tempOutputPath).catch(console.error);

                  resolve(
                    new NextResponse(fileBuffer, {
                      headers: {
                        'Content-Type': 'video/mp4',
                        'Content-Disposition': `inline; filename="${encodeURIComponent(mediaItem.file_name)}.mp4"`,
                        'Cache-Control': 'public, max-age=604800', // Cache for 7 days
                        'Accept-Ranges': 'bytes', // Indicate we support range requests
                      },
                    }),
                  );
                }
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

/**
 * Stream a video file with support for HTTP Range requests
 * This enables efficient video streaming in browsers
 */
function streamVideoFile(
  filePath: string,
  rangeHeader: string,
  contentType: string,
  fileName: string,
): NextResponse {
  // Get file stats
  const stat = statSync(filePath);
  const fileSize = stat.size;

  // Parse range
  // Example: "bytes=32324-"
  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = Number.parseInt(parts[0], 10);
  const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;

  // Handle invalid ranges
  if (isNaN(start) || start < 0 || start >= fileSize) {
    return new NextResponse('Invalid range', {
      status: 416, // Range Not Satisfiable
      headers: {
        'Content-Range': `bytes */${fileSize}`,
      },
    });
  }

  // Calculate the chunk size
  const chunkSize = end - start + 1;

  // Create the stream
  const stream = createReadStream(filePath, { start, end });

  // Stream the content
  return new NextResponse(stream as any, {
    status: 206, // Partial Content
    headers: {
      'Content-Type': contentType,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': `${chunkSize}`,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    },
  });
}

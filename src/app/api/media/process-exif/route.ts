import { streamProcessUnprocessedItems } from '@/app/api/actions/exif';
import type { ExtractionMethod } from '@/types/exif';
import { type NextRequest, NextResponse } from 'next/server';

export const GET = async (request: NextRequest) => {
  try {
    // Get skipLargeFiles parameter from URL
    const skipLargeFiles =
      request.nextUrl.searchParams.get('skipLargeFiles') === 'true';

    // Get abort token from URL
    const abortToken = request.nextUrl.searchParams.get('abortToken');

    // Get extraction method
    const extractionMethod = (request.nextUrl.searchParams.get('method') ||
      'default') as ExtractionMethod;

    // Validate extraction method
    if (
      extractionMethod !== 'default' &&
      extractionMethod !== 'sharp-only' &&
      extractionMethod !== 'direct-only' &&
      extractionMethod !== 'marker-only'
    ) {
      return NextResponse.json(
        { error: 'Invalid extraction method' },
        { status: 400 },
      );
    }

    // Create a streaming response with the EXIF processing stream
    const stream = await streamProcessUnprocessedItems({
      skipLargeFiles,
      abortToken: abortToken || undefined,
      extractionMethod,
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in EXIF processing stream:', error);
    return NextResponse.json(
      { error: 'Failed to start EXIF processing' },
      { status: 500 },
    );
  }
};

// Set a longer timeout for this route to allow for longer processing
export const maxDuration = 300; // 5 minutes

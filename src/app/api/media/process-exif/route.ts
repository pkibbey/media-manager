import { streamProcessUnprocessedItems } from '@/app/api/actions/exif';
import { type NextRequest, NextResponse } from 'next/server';

export const GET = async (_request: NextRequest) => {
  try {
    // Create a streaming response with the EXIF processing stream
    const stream = await streamProcessUnprocessedItems();

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

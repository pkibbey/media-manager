import { type NextRequest, NextResponse } from 'next/server';
import { processBatchThumbnails } from '@/actions/thumbnails/process-thumbnails';

export async function POST(req: NextRequest) {
  try {
    const { limit = 10, concurrency = 5 } = await req.json().catch(() => ({}));

    const result = await processBatchThumbnails(limit, concurrency);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

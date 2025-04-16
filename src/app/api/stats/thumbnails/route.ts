'use server';

import { getThumbnailStats } from '@/app/api/actions/thumbnails';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await getThumbnailStats();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      stats: result.stats,
    });
  } catch (error: any) {
    console.error('Error in thumbnail stats API route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 },
    );
  }
}

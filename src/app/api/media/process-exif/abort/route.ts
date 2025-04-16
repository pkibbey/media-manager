import { addAbortToken } from '@/lib/abort-tokens';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Get the abort token from the URL query
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing token parameter' },
      { status: 400 },
    );
  }

  // Add token to the set of aborted operations
  addAbortToken(token);

  return NextResponse.json({ success: true });
}

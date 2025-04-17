import { guessFileCategory, guessFileCategoryDefault } from '@/lib/utils';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const extension = searchParams.get('extension');

  if (!extension) {
    return NextResponse.json(
      { error: 'Missing extension parameter' },
      { status: 400 },
    );
  }

  try {
    // Use the server-side function that will check the database
    const category = await guessFileCategory(extension);
    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error guessing file category:', error);

    // Fall back to the default logic if there's any error
    const defaultCategory = guessFileCategoryDefault(extension);
    return NextResponse.json({ category: defaultCategory });
  }
}

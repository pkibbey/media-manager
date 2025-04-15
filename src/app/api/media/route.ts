import fs from 'node:fs/promises';
import path from 'node:path';
import { createServerSupabaseClient } from '@/lib/supabase';
import { lookup } from 'mime-types';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

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

    // Get the file extension and MIME type
    const fileExtension = path.extname(mediaItem.file_path).substring(1);
    const mimeType = lookup(fileExtension) || 'application/octet-stream';

    // Read the file
    const fileData = await fs.readFile(mediaItem.file_path);

    // Return the file with appropriate headers
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(mediaItem.file_name)}"`,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error: any) {
    console.error('Error serving media file:', error);
    return NextResponse.json(
      { error: 'Error serving media file' },
      { status: 500 },
    );
  }
}

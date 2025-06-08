import { Queue } from 'bullmq';
import { type NextRequest, NextResponse } from 'next/server';
import { createRedisConnection, createSupabase } from 'shared';
import type { ProcessType, QueueName } from 'shared/types';

const connection = createRedisConnection();

// Helper function to get a single eligible media item for each queue
async function getEligibleMediaItem(queueName: QueueName): Promise<any | null> {
  const supabase = createSupabase();

  switch (queueName) {
    case 'advancedAnalysisQueue': {
      const { data, error } = await supabase
        .from('media')
        .select('id, thumbnail_url, media_types!inner(is_ignored)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .not('thumbnail_url', 'is', null)
        .order('id', { ascending: true })
        .limit(1)
        .single();

      return error ? null : data;
    }

    case 'objectAnalysisQueue': {
      const { data, error } = await supabase
        .from('media')
        .select('id, thumbnail_url, media_types!inner(is_ignored)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .not('thumbnail_url', 'is', null)
        .order('id', { ascending: true })
        .limit(1)
        .single();

      return error ? null : data;
    }

    case 'blurryPhotosQueue': {
      const { data, error } = await supabase
        .from('media')
        .select('id, media_path, thumbnail_url')
        .not('thumbnail_url', 'is', null)
        .is('blurry_photo_process', null)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      return error ? null : data;
    }

    case 'duplicatesQueue': {
      const { data, error } = await supabase
        .from('media')
        .select(
          'id, media_path, thumbnail_url, visual_hash, media_types!inner(is_ignored)',
        )
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .not('thumbnail_url', 'is', null)
        .order('id', { ascending: true })
        .limit(1)
        .single();

      return error ? null : data;
    }

    case 'exifQueue': {
      const { data, error } = await supabase
        .from('media')
        .select('*, media_types!inner(is_ignored)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .ilike('media_types.mime_type', 'image/%')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      return error ? null : data;
    }

    case 'thumbnailQueue': {
      const { data, error } = await supabase
        .from('media')
        .select('id, media_path, size_bytes, media_types!inner(is_ignored)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .ilike('media_types.mime_type', 'image/%')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      return error ? null : data;
    }

    case 'visualHashQueue': {
      const { data, error } = await supabase
        .from('media')
        .select('id, thumbnail_url, size_bytes, media_types!inner(is_ignored)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .ilike('media_types.mime_type', 'image/%')
        .not('thumbnail_url', 'is', null)
        .is('visual_hash', null)
        .order('id', { ascending: true })
        .limit(1)
        .single();

      return error ? null : data;
    }

    case 'fixImageDatesQueue': {
      const { data, error } = await supabase
        .from('media')
        .select(`
          id,
          media_path,
          media_types!inner(is_ignored, mime_type),
          exif_data!inner(exif_timestamp)
        `)
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .order('id', { ascending: true })
        .limit(1)
        .single();

      return error ? null : data;
    }

    case 'contentWarningsQueue': {
      const { data, error } = await supabase
        .from('media')
        .select('id, thumbnail_url, media_types!inner(is_ignored)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .not('thumbnail_url', 'is', null)
        .order('id', { ascending: true })
        .limit(1)
        .single();

      return error ? null : data;
    }

    default:
      return null;
  }
}

// Helper function to add a single item to the appropriate queue
async function addItemToQueue(
  queueName: QueueName,
  mediaItem: any,
  method: ProcessType,
): Promise<boolean> {
  const queue = new Queue(queueName, { connection });

  try {
    switch (queueName) {
      case 'advancedAnalysisQueue':
        await queue.add(
          'advanced-analysis',
          {
            ...mediaItem,
            method,
          },
          {
            jobId: `${mediaItem.id}-${method}`,
            priority: 100, // High priority for single item processing
          },
        );
        break;

      case 'objectAnalysisQueue':
        await queue.add(
          'object-detection',
          {
            ...mediaItem,
            method,
          },
          {
            jobId: `${mediaItem.id}-${method}`,
            priority: 100,
          },
        );
        break;

      case 'blurryPhotosQueue':
        await queue.add(
          'process-blurry-photo',
          {
            ...mediaItem,
            method,
          },
          {
            jobId: `${mediaItem.id}-${method}`,
            priority: 100,
          },
        );
        break;

      case 'duplicatesQueue':
        await queue.add(
          'duplicate-detection',
          {
            ...mediaItem,
            method,
          },
          {
            jobId: `${mediaItem.id}-${method}`,
            priority: 100,
          },
        );
        break;

      case 'exifQueue':
        await queue.add(
          'exif-extraction',
          {
            ...mediaItem,
            method,
          },
          {
            jobId: `${mediaItem.id}-${method}`,
            priority: 100,
          },
        );
        break;

      case 'thumbnailQueue':
        await queue.add(
          'thumbnail-generation',
          {
            ...mediaItem,
            method,
          },
          {
            jobId: `${mediaItem.id}-${method}`,
            priority: 100,
          },
        );
        break;

      case 'visualHashQueue':
        await queue.add(
          'visual-hash-generation',
          {
            ...mediaItem,
            method,
          },
          {
            jobId: `${mediaItem.id}-${method}`,
            priority: 100,
          },
        );
        break;

      case 'fixImageDatesQueue':
        await queue.add(
          'fix-image-dates',
          {
            ...mediaItem,
            method,
          },
          {
            jobId: `${mediaItem.id}-${method}`,
            priority: 100,
          },
        );
        break;

      case 'contentWarningsQueue':
        await queue.add(
          'content-warning-detection',
          {
            ...mediaItem,
            method,
          },
          {
            jobId: `${mediaItem.id}-${method}`,
            priority: 100,
          },
        );
        break;

      default:
        return false;
    }

    return true;
  } catch (error) {
    console.error(`Error adding item to ${queueName}:`, error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queueName = searchParams.get('queueName') as QueueName;
  const method = searchParams.get('method') as ProcessType;

  if (!queueName) {
    return NextResponse.json(
      { error: 'Missing queueName parameter' },
      { status: 400 },
    );
  }

  if (!method) {
    return NextResponse.json(
      { error: 'Missing method parameter' },
      { status: 400 },
    );
  }

  try {
    // Get one eligible media item
    const mediaItem = await getEligibleMediaItem(queueName);

    if (!mediaItem) {
      return NextResponse.json({
        success: true,
        message: `No eligible media items found for ${queueName}`,
        itemsAdded: 0,
      });
    }

    // Add the item to the queue
    const success = await addItemToQueue(queueName, mediaItem, method);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Successfully added 1 item to ${queueName} with ${method} method`,
        itemsAdded: 1,
        mediaId: mediaItem.id,
      });
    }

    return NextResponse.json(
      { error: `Failed to add item to ${queueName}` },
      { status: 500 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Error in add-one-to-queue for ${queueName}:`, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

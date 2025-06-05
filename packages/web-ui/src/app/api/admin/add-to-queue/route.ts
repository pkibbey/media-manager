import { type NextRequest, NextResponse } from 'next/server';
import type { QueueConfig, QueueName } from 'shared/types';

// Import all queue functions
import { addAdvancedToQueue } from '@/actions/advanced/add-advanced-to-queue';
import { addToDuplicatesQueue } from '@/actions/duplicates/add-duplicates-to-queue';
import { addExifToQueue } from '@/actions/exif/add-exif-to-queue';
import { addFixDatesToQueue } from '@/actions/fix-dates/add-fix-dates-to-queue';
import { addObjectsToQueue } from '@/actions/objects/add-objects-to-queue';
import { addToThumbnailsQueue } from '@/actions/thumbnails/add-thumbnails-to-queue';
import { addWarningsToQueue } from '@/actions/warnings/add-warnings-to-queue';

// Queue configuration mapping
const QUEUE_ACTIONS: Partial<Record<QueueName, QueueConfig>> = {
  advancedAnalysisQueue: {
    action: addAdvancedToQueue,
    name: 'Advanced Analysis',
  },
  objectAnalysisQueue: {
    action: addObjectsToQueue,
    name: 'Object Analysis',
  },
  contentWarningsQueue: {
    action: addWarningsToQueue,
    name: 'Content Warnings',
  },
  duplicatesQueue: {
    action: addToDuplicatesQueue,
    name: 'Duplicates',
  },
  exifQueue: {
    action: addExifToQueue,
    name: 'EXIF Processing',
  },
  thumbnailQueue: {
    action: addToThumbnailsQueue,
    name: 'Thumbnail Generation',
  },
  fixImageDatesQueue: {
    action: addFixDatesToQueue,
    name: 'Fix Image Dates',
  },
} as const;

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queueName = searchParams.get('queueName') as QueueName;

  if (!queueName) {
    return NextResponse.json(
      { error: 'Missing queueName parameter' },
      { status: 400 },
    );
  }

  if (!QUEUE_ACTIONS[queueName]) {
    return NextResponse.json(
      { error: `Unsupported queue: ${queueName}` },
      { status: 400 },
    );
  }

  try {
    const { action, name } = QUEUE_ACTIONS[queueName];

    // Start the process asynchronously without waiting for it to complete
    action().catch((error) => {
      console.error(`Background ${queueName} failed:`, error);
    });

    // Return immediately to unblock the UI
    return NextResponse.json({
      success: true,
      message: `${name} queue operation started in background`,
    });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Failed to start queue operation';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

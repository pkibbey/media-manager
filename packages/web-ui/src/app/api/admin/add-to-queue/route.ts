import { type NextRequest, NextResponse } from 'next/server';

// Import all queue functions
import { addAdvancedToQueue } from '@/actions/advanced/add-advanced-to-queue';
import { addBasicToQueue } from '@/actions/basic/add-basic-to-queue';
import { addContentWarningsToQueue } from '@/actions/content-warnings/add-content-warnings-to-queue';
import { addRemainingToDuplicatesQueue } from '@/actions/duplicates/add-duplicates-to-queue';
import { addExifToQueue } from '@/actions/exif/add-exif-to-queue';
import { addRemainingToThumbnailsQueue } from '@/actions/thumbnails/process-thumbnail';

// Queue configuration mapping
const QUEUE_ACTIONS = {
  advancedAnalysisQueue: {
    action: addAdvancedToQueue,
    name: 'Advanced Analysis',
  },
  objectAnalysisQueue: {
    action: addBasicToQueue,
    name: 'Object Analysis',
  },
  contentWarningsQueue: {
    action: addContentWarningsToQueue,
    name: 'Content Warnings',
  },
  duplicatesQueue: {
    action: addRemainingToDuplicatesQueue,
    name: 'Duplicates',
  },
  exifQueue: {
    action: addExifToQueue,
    name: 'EXIF Processing',
  },
  thumbnailQueue: {
    action: addRemainingToThumbnailsQueue,
    name: 'Thumbnail Generation',
  },
} as const;

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queueName = searchParams.get('queueName') as keyof typeof QUEUE_ACTIONS;

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

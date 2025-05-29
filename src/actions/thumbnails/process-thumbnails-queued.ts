'use server';

import { addThumbnailJob } from '@/actions/queue/queue-service';

export async function queueThumbnailProcessing(limit = 10, concurrency = 3) {
  try {
    const result = await addThumbnailJob(limit, concurrency);

    return {
      success: true,
      jobId: result.jobId,
      message: 'Thumbnail processing job queued successfully',
    };
  } catch (error) {
    console.error('Error queueing thumbnail processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to queue thumbnail processing job',
    };
  }
}

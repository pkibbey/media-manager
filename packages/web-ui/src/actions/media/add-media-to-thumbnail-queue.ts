'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

const thumbnailQueue = new Queue('thumbnailQueue', { connection });

export type ThumbnailProcessingMethod = 'ultra' | 'fast' | 'slow';

export async function addMediaToThumbnailQueue(
  mediaId: string,
  mediaPath: string,
  method: ThumbnailProcessingMethod = 'ultra',
): Promise<{ success: boolean; error?: string }> {
  try {
    await thumbnailQueue.add(
      'thumbnail-generation',
      {
        id: mediaId,
        media_path: mediaPath,
        method,
      },
      {
        jobId: `${mediaId}-${method}`, // Use media ID + method as job ID for uniqueness
        priority: 100, // High priority for individual processing
      },
    );

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `Error adding media ${mediaId} to thumbnail queue:`,
      errorMessage,
    );
    return { success: false, error: errorMessage };
  }
}

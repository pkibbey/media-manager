'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { appConfig, serverEnv } from 'shared/env';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

const exifQueue = new Queue('exifQueue', { connection });

export type ExifProcessingMethod = 'fast' | 'slow';

export async function addMediaToExifQueue(
  mediaId: string,
  mediaPath: string,
  method: ExifProcessingMethod = 'fast',
): Promise<{ success: boolean; error?: string }> {
  try {
    await exifQueue.add(
      'exif-extraction',
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
    console.error(`Error adding media ${mediaId} to EXIF queue:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

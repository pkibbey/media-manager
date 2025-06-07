'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared';
import { appConfig, serverEnv } from 'shared/env';
import type { ProcessType } from 'shared/types';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

const duplicatesQueue = new Queue('duplicatesQueue', { connection });

export async function addToDuplicatesQueue(method: ProcessType = 'standard') {
  const supabase = createSupabase();

  // Handle auto-delete method differently
  if (method === 'auto-delete') {
    try {
      // Add a single job to process all identical duplicates
      const job = await duplicatesQueue.add('auto-delete', {
        method,
      });

      console.log('Added auto-delete job to duplicates queue:', job.id);
      return true;
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Unknown error occurred';
      console.error('Error adding auto-delete job:', errorMessage);
      return false;
    }
  }

  // Existing logic for other methods
  let offset = 0;
  const batchSize = 1000;

  try {
    while (true) {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select(
          'id, media_path, thumbnail_url, visual_hash, media_types!inner(is_ignored)',
        )
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .not('thumbnail_url', 'is', null) // Must have a thumbnail_url in order to generate a visual hash
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching unprocessed media items:', error);
        return false;
      }

      if (!mediaItems || mediaItems.length === 0) {
        return false;
      }

      const jobs = await duplicatesQueue.addBulk(
        mediaItems.map((data) => ({
          name: 'duplicate-detection',
          data: {
            ...data,
            method,
          },
          opts: {
            jobId: `${data.id}-${method}`, // Use media ID + method as job ID for uniqueness
          },
        })),
      );

      console.log(
        'Added',
        jobs.length,
        'to the duplicates queue for processing',
      );

      offset += mediaItems.length;
      if (mediaItems.length < batchSize) {
        return false;
      }
    }
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Error in addToDuplicatesQueue:', errorMessage);
    return false;
  }
}

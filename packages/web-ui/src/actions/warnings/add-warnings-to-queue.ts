'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared';
import type { ProcessType } from 'shared/types';

const connection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
  {
    maxRetriesPerRequest: null, // Disable automatic retries
  },
);

const contentWarningsQueue = new Queue('contentWarningsQueue', { connection });

export async function addWarningsToQueue(method: ProcessType = 'standard') {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000;

  try {
    while (true) {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select('*, media_types!inner(*)')
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

      await contentWarningsQueue.addBulk(
        mediaItems.map((data) => ({
          name: 'content-warning-detection',
          data: {
            ...data,
            method,
          },
          opts: {
            jobId: `${data.id}-${method}`, // Use media ID + method as job ID for uniqueness
          },
        })),
      );

      offset += mediaItems.length;
      if (mediaItems.length < batchSize) {
        // Last batch processed fewer items than batchSize, so we are done
        break;
      }
    }

    return true;
  } catch (error) {
    console.error(
      'Error adding remaining items to content warning queue:',
      error,
    );
    return false;
  }
}

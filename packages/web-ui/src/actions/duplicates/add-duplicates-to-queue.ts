'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared/supabase';

const connection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
  {
    maxRetriesPerRequest: null,
  },
);

const duplicatesQueue = new Queue('duplicatesQueue', { connection });

export async function addRemainingToDuplicatesQueue() {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000;

  try {
    while (true) {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select('id, visual_hash, media_types!inner(*)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .not('visual_hash', 'is', null) // Must have a visual hash
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
          data,
          opts: {
            jobId: data.id, // Use media ID as job ID for uniqueness
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
    console.error('Error in addRemainingToDuplicatesQueue:', errorMessage);
    return false;
  }
}

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

const thumbnailQueue = new Queue('thumbnailQueue', { connection });

export async function addRemainingToThumbnailsQueue() {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000;

  try {
    while (true) {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select('id, media_path, media_types!inner(*)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching unprocessed media items:', error);
        return false;
      }

      if (!mediaItems || mediaItems.length === 0) {
        return false;
      }

      await thumbnailQueue.addBulk(
        mediaItems.map((data) => ({
          name: 'thumbnail-generation',
          data,
          opts: {
            jobId: data.id, // Use media ID as job ID for uniqueness
          },
        })),
      );

      offset += mediaItems.length;
      if (mediaItems.length < batchSize) {
        return false;
      }
    }
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Error in addRemainingToThumbnailsQueue:', errorMessage);
    return false;
  }
}

'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared/supabase';

const connection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
  {
    maxRetriesPerRequest: null, // Disable automatic retries
  },
);

const objectAnalysisQueue = new Queue('objectAnalysisQueue', { connection });

export async function addBasicToQueue() {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000; // Supabase default limit, can be adjusted if needed

  try {
    while (true) {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select('id, thumbnail_url')
        .eq('is_objects_processed', false)
        .eq('is_thumbnail_processed', true)
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching unprocessed media items:', error);
        return false;
      }

      if (!mediaItems || mediaItems.length === 0) {
        // No more items to fetch
        return false;
      }

      const jobs = await objectAnalysisQueue.addBulk(
        mediaItems.map((data) => ({
          name: 'object-detection',
          data,
          opts: {
            jobId: data.id, // Use media ID as job ID for uniqueness
          },
        })),
      );

      console.log('Added', jobs.length, 'to the queue for processing');

      offset += mediaItems.length;

      // If fewer items than batchSize were returned, it means we've fetched all available items
      if (mediaItems.length < batchSize) {
        return false;
      }
    }
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Error in addRemainingToProcessingQueue:', errorMessage);
    return false;
  }
}

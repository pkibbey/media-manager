'use server';

import { Queue } from 'bullmq';
import { createRedisConnection } from 'shared/redis';
import { createSupabase } from 'shared/supabase';

const connection = createRedisConnection();

const advancedAnalysisQueue = new Queue('advancedAnalysisQueue', {
  connection,
});

export async function addAdvancedToQueue() {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000;

  try {
    while (true) {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select('id, thumbnail_url, media_types!inner(*)')
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

      const jobs = await advancedAnalysisQueue.addBulk(
        mediaItems.map((data) => ({
          name: 'advanced-analysis',
          data,
          opts: {
            jobId: data.id, // Use media ID as job ID for uniqueness
          },
        })),
      );

      console.log(
        'Added',
        jobs.length,
        'to the advanced analysis queue for processing',
      );

      offset += mediaItems.length;
      if (mediaItems.length < batchSize) {
        return false;
      }
    }
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Error in addToAdvancedAnalysisQueue:', errorMessage);
    return false;
  }
}

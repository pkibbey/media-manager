'use server';

import { Queue } from 'bullmq';
import { createSupabase } from 'shared';
import { createRedisConnection } from 'shared/redis';
import type { ProcessType } from 'shared/types';

const connection = createRedisConnection();

const blurryPhotosQueue = new Queue('blurryPhotosQueue', {
  connection,
});

export async function addBlurryPhotosToQueue(
  method: ProcessType = 'standard',
): Promise<boolean> {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000;

  try {
    while (true) {
      // Get media that has thumbnails but hasn't been processed for blurry photos yet
      const { data: media, error } = await supabase
        .from('media')
        .select('id, media_path, thumbnail_url')
        .not('thumbnail_url', 'is', null)
        .is('blurry_photo_process', null)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .order('created_at', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching media for blurry photos queue:', error);
        return false;
      }

      if (!media || media.length === 0) {
        // No more items to process
        return true;
      }

      console.log(
        `Adding ${media.length} media items to blurry photos queue (batch ${Math.floor(offset / batchSize) + 1})`,
      );

      // Add jobs to queue
      const jobs = media.map((data) => ({
        name: 'process-blurry-photo',
        data: {
          ...data,
          method,
        },
        opts: {
          jobId: `${data.id}-${method}`, // Use media ID + method as job ID for uniqueness
        },
      }));

      await blurryPhotosQueue.addBulk(jobs);

      console.log(
        `Successfully added ${jobs.length} jobs to blurry photos queue`,
      );

      offset += media.length;
      if (media.length < batchSize) {
        // If fewer items than batchSize were returned, we've processed all available items
        return true;
      }
    }
  } catch (error) {
    console.error('Error adding to blurry photos queue:', error);
    return false;
  }
}

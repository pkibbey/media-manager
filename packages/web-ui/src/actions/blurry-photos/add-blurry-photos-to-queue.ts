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
  try {
    const supabase = createSupabase();

    // Get media that has thumbnails but hasn't been processed for blurry photos yet
    const { data: media, error } = await supabase
      .from('media')
      .select('id, media_path, thumbnail_url')
      .not('thumbnail_url', 'is', null)
      .is('blurry_photo_process', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching media for blurry photos queue:', error);
      throw error;
    }

    if (!media || media.length === 0) {
      console.log('No media items found for blurry photos processing');
      return true;
    }

    console.log(`Adding ${media.length} media items to blurry photos queue`);

    // Add jobs to queue
    const jobs = media.map((item) => ({
      name: 'process-blurry-photo',
      data: {
        id: item.id,
        media_path: item.media_path,
        thumbnail_url: item.thumbnail_url,
        method,
      },
    }));

    await blurryPhotosQueue.addBulk(jobs);

    console.log(
      `Successfully added ${jobs.length} jobs to blurry photos queue`,
    );
    return true;
  } catch (error) {
    console.error('Error adding to blurry photos queue:', error);
    throw error;
  }
}

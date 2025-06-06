'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared';
import { appConfig, serverEnv } from 'shared/env';
import type { ProcessType } from 'shared/types';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

const fixImageDatesQueue = new Queue('fixImageDatesQueue', { connection });

export async function addFixDatesToQueue(
  method: ProcessType = 'standard',
): Promise<boolean> {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000;

  try {
    while (true) {
      // Find images without EXIF timestamps
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select(`
          id,
          media_path,
          media_types!inner(is_ignored, mime_type),
          exif_data!inner(exif_timestamp)
        `)
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching media items:', error);
        return false;
      }

      if (!mediaItems || mediaItems.length === 0) {
        return false;
      }

      const jobs = mediaItems.map((data) => ({
        name: 'fix-image-dates',
        data: {
          id: data.id,
          media_path: data.media_path,
          exif_timestamp: data.exif_data.exif_timestamp,
          method,
        },
        opts: {
          jobId: `${data.id}-${method}`, // Use media ID + method as job ID for uniqueness
        },
      }));

      await fixImageDatesQueue.addBulk(jobs);

      console.log(
        'Added',
        jobs.length,
        'images without dates to the fix image dates queue for processing',
      );

      offset += mediaItems.length;
      if (mediaItems.length < batchSize) {
        return false;
      }
    }
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Error in addFixImageDatesToQueue:', errorMessage);
    return false;
  }
}

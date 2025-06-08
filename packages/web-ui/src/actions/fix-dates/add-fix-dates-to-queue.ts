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
      const { data: media, error } = await supabase
        .from('media')
        .select(' *, media_types!inner(*), exif_data!inner(*)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching media items:', error);
        return false;
      }

      if (!media || media.length === 0) {
        return false;
      }

      const jobs = media.map((data) => ({
        name: 'fix-image-dates',
        data: {
          ...data,
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

      offset += media.length;
      if (media.length < batchSize) {
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

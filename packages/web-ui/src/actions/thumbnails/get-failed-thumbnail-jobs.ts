'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared';
import { appConfig, serverEnv } from 'shared/env';
import type { MediaWithRelations } from 'shared/types';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

interface FailedThumbnailJob {
  id: string;
  data: {
    id: string;
    media_path: string;
    method: string;
  };
  failedReason?: string;
  finishedOn?: number;
}

/**
 * Get failed thumbnail generation jobs and their corresponding media data
 */
export async function getFailedThumbnailJobs(): Promise<MediaWithRelations[]> {
  try {
    const queue = new Queue('thumbnailQueue', { connection });

    // Get failed jobs from the queue
    const failedJobs = (await queue.getJobs(
      ['failed'],
      0,
      100, // Limit to 200 jobs for performance
      false,
    )) as FailedThumbnailJob[];

    if (!failedJobs || failedJobs.length === 0) {
      return [];
    }

    // Extract media IDs from failed jobs
    const mediaIds = failedJobs.map((job) => job.data.id).filter(Boolean);

    if (mediaIds.length === 0) {
      return [];
    }

    // Fetch media data from Supabase
    const supabase = createSupabase();
    const { data: mediaItems, error } = await supabase
      .from('media')
      .select(`
        *,
        media_types(*),
        exif_data(*),
        analysis_data(*)
      `)
      .in('id', mediaIds)
      .is('is_deleted', false)
      .is('is_hidden', false)
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching failed media items:', error);
      return [];
    }

    // analysis_data is now directly an object or null from Supabase
    // due to the 1:1 database mapping. No transformation is needed.
    return (mediaItems as MediaWithRelations[]) || [];
  } catch (error) {
    console.error('Error getting failed thumbnail jobs:', error);
    return [];
  }
}

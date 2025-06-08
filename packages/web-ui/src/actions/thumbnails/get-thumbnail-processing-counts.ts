'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared';
import { appConfig, serverEnv } from 'shared/env';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

export interface ThumbnailProcessingCounts {
  // Database counts
  database: {
    totalMedia: number;
    withThumbnails: number;
    withoutThumbnails: number;
    imageMediaOnly: number;
  };

  // Queue counts
  queue: {
    completed: number;
    failed: number;
    active: number;
    waiting: number;
    totalProcessed: number; // completed + failed
  };

  // Mismatch detection
  mismatches: {
    completedButNoThumbnail: number; // Jobs completed but thumbnail_url is null
    failedButHasThumbnail: number; // Jobs failed but thumbnail_url is not null
    totalMismatches: number;
  };

  // Summary statistics
  summary: {
    expectedMatches: number; // completed jobs with thumbnails + failed jobs without thumbnails
    actualMatches: number; // queue processed count - mismatches
    matchPercentage: number; // (actualMatches / expectedMatches) * 100
  };
}

/**
 * Get comprehensive thumbnail processing statistics comparing database state with queue statistics
 */
export async function getThumbnailProcessingCounts(): Promise<ThumbnailProcessingCounts> {
  try {
    const supabase = createSupabase();
    const queue = new Queue('thumbnailQueue', { connection });

    // Get database counts
    const [
      { count: totalMedia },
      { count: withThumbnails },
      { count: withoutThumbnails },
      { count: imageMediaOnly },
    ] = await Promise.all([
      // Total media items (excluding ignored, deleted, hidden)
      supabase
        .from('media')
        .select('*, media_types!inner(*)', {
          count: 'exact',
          head: true,
        })
        .is('is_deleted', false)
        .is('is_hidden', false)
        .eq('media_types.is_ignored', false),

      // Media with thumbnails
      supabase
        .from('media')
        .select('*, media_types!inner(*)', {
          count: 'exact',
          head: true,
        })
        .is('is_deleted', false)
        .is('is_hidden', false)
        .eq('media_types.is_ignored', false)
        .not('thumbnail_url', 'is', null),

      // Media without thumbnails
      supabase
        .from('media')
        .select('*, media_types!inner(*)', {
          count: 'exact',
          head: true,
        })
        .is('is_deleted', false)
        .is('is_hidden', false)
        .eq('media_types.is_ignored', false)
        .is('thumbnail_url', null),

      // Image media only (primary target for thumbnails)
      supabase
        .from('media')
        .select('*, media_types!inner(*)', { count: 'exact', head: true })
        .is('is_deleted', false)
        .is('is_hidden', false)
        .eq('media_types.is_ignored', false)
        .ilike('media_types.mime_type', 'image/%'),
    ]);

    // Get queue job counts
    const queueCounts = await queue.getJobCounts();

    // Get failed jobs to check for mismatches
    const failedJobs = await queue.getJobs(['failed'], 0, 1000);
    const completedJobs = await queue.getJobs(['completed'], 0, 1000);

    // Extract media IDs from jobs for mismatch checking
    const failedMediaIds = failedJobs
      .map((job) => job.data?.id)
      .filter(Boolean);
    const completedMediaIds = completedJobs
      .map((job) => job.data?.id)
      .filter(Boolean);

    let completedButNoThumbnail = 0;
    let failedButHasThumbnail = 0;

    // Check for mismatches only if we have job data to analyze
    if (completedMediaIds.length > 0) {
      const { count } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .in('id', completedMediaIds)
        .is('thumbnail_url', null);
      completedButNoThumbnail = count || 0;
    }

    if (failedMediaIds.length > 0) {
      const { count } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .in('id', failedMediaIds)
        .not('thumbnail_url', 'is', null);
      failedButHasThumbnail = count || 0;
    }

    const totalMismatches = completedButNoThumbnail + failedButHasThumbnail;
    const totalProcessed =
      (queueCounts.completed || 0) + (queueCounts.failed || 0);

    // Calculate summary statistics
    const expectedMatches = Math.max(0, totalProcessed - totalMismatches);
    const actualMatches = totalProcessed - totalMismatches;
    const matchPercentage =
      totalProcessed > 0 ? (actualMatches / totalProcessed) * 100 : 100;

    return {
      database: {
        totalMedia: totalMedia || 0,
        withThumbnails: withThumbnails || 0,
        withoutThumbnails: withoutThumbnails || 0,
        imageMediaOnly: imageMediaOnly || 0,
      },
      queue: {
        completed: queueCounts.completed || 0,
        failed: queueCounts.failed || 0,
        active: queueCounts.active || 0,
        waiting: queueCounts.waiting || 0,
        totalProcessed,
      },
      mismatches: {
        completedButNoThumbnail,
        failedButHasThumbnail,
        totalMismatches,
      },
      summary: {
        expectedMatches,
        actualMatches,
        matchPercentage: Math.round(matchPercentage * 100) / 100, // Round to 2 decimal places
      },
    };
  } catch (error) {
    console.error('Error getting thumbnail processing counts:', error);

    // Return empty/error state
    return {
      database: {
        totalMedia: 0,
        withThumbnails: 0,
        withoutThumbnails: 0,
        imageMediaOnly: 0,
      },
      queue: {
        completed: 0,
        failed: 0,
        active: 0,
        waiting: 0,
        totalProcessed: 0,
      },
      mismatches: {
        completedButNoThumbnail: 0,
        failedButHasThumbnail: 0,
        totalMismatches: 0,
      },
      summary: {
        expectedMatches: 0,
        actualMatches: 0,
        matchPercentage: 0,
      },
    };
  }
}

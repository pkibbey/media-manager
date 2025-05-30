'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { DEFAULT_CONCURRENCY } from '@/lib/consts';
import { createSupabase } from '@/lib/supabase';
import { clearModelCache, processBatchForObjects } from './process-for-objects';

const connection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const objectAnalysisQueue = new Queue('objectAnalysisQueue', { connection });

const JOB_NAME = 'object-detection-basic';

/**
 * Process analysis for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @returns Object with count of processed items and any errors
 */
export async function processBasicAnalysis(limit = 10) {
  try {
    const supabase = createSupabase();

    // Find media items that need analysis processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('*, analysis_data(*), exif_data(*), media_types(*)')
      .eq('is_thumbnail_processed', true)
      .eq('is_basic_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        total: 0,
        message: 'No items to process',
      };
    }

    // Use optimized batch processing
    const batchResult = await processBatchForObjects(
      mediaItems,
      DEFAULT_CONCURRENCY,
    );

    return {
      success: batchResult.success,
      processed: batchResult.processedCount,
      failed: batchResult.failedCount,
      total: mediaItems.length,
      batchProcessingTime: batchResult.totalProcessingTime,
      message: `Processed ${batchResult.processedCount} items (${batchResult.failedCount} failed) in basic analysis`,
    };
  } catch (error) {
    console.error('Error in batch analysis processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      failed: 0,
      total: 0,
      processed: 0,
      message: 'Basic analysis batch processing failed',
    };
  } finally {
    // Clean up memory after large batches
    if (limit > 50) {
      await clearModelCache();
    }
  }
}

export async function addRemainingToProcessingQueue() {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000; // Supabase default limit, can be adjusted if needed

  try {
    while (true) {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select('id, thumbnail_url')
        .eq('is_basic_processed', false)
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
          name: JOB_NAME,
          data,
          opts: { removeOnComplete: true, removeOnFail: true },
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

export async function clearBasicAnalysisQueue() {
  try {
    const count = await objectAnalysisQueue.getJobCountByTypes(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );
    if (count > 0) {
      await objectAnalysisQueue.drain(true);
    }
    return true;
  } catch (error) {
    console.error('Error clearing basic analysis queue:', error);
    return false;
  }
}

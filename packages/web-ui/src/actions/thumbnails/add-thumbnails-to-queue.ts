'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { createSupabase } from 'shared';
import { appConfig, serverEnv } from 'shared/env';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

const thumbnailQueue = new Queue('thumbnailQueue', { connection });

/**
 * Calculate priority for thumbnail processing jobs
 * Higher numbers = higher priority (processed first)
 *
 * Priority factors:
 * - File size: Smaller files get higher priority (faster processing)
 * - Media type: Images > Audio > Application > Video (complexity order)
 * - Native support: Native formats get slight boost
 * - Common formats: Well-supported formats get slight boost
 */
function calculateThumbnailPriority(mediaItem: any): number {
  let priority = 0;

  // Base priority from file size (smaller files = higher priority)
  // Use inverse log scale: very small files get big boost, diminishing returns for larger files
  const sizeBytes = mediaItem.size_bytes || 0;
  if (sizeBytes > 0) {
    // Scale: 1MB = ~60 points, 10MB = ~40 points, 100MB = ~20 points, 1GB = ~0 points
    const sizeMB = sizeBytes / (1024 * 1024);
    priority += Math.max(0, 100 - Math.log10(sizeMB + 1) * 30);
  }

  // Native format bonus (faster processing, no conversion needed)
  if (mediaItem.media_types?.is_native) {
    priority += 15;
  }

  // Add small random component to break ties and distribute load
  priority += Math.random() * 5;

  return Math.round(priority);
}

export async function addToThumbnailsQueue() {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000;

  try {
    while (true) {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select('id, media_path, size_bytes, media_types!inner(*)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        // Only select image mime types for thumbnail processing
        .ilike('media_types.mime_type', 'image/%')
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching unprocessed media items:', error);
        return false;
      }

      if (!mediaItems || mediaItems.length === 0) {
        return false;
      }

      // Calculate priorities and log distribution for monitoring
      const jobsWithPriorities = mediaItems.map((data) => {
        const priority = calculateThumbnailPriority(data);
        return {
          name: 'thumbnail-generation',
          data,
          opts: {
            jobId: data.id, // Use media ID as job ID for uniqueness
            priority,
          },
        };
      });

      await thumbnailQueue.addBulk(jobsWithPriorities);

      offset += mediaItems.length;
      if (mediaItems.length < batchSize) {
        return false;
      }
    }
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Error in addToThumbnailsQueue:', errorMessage);
    return false;
  }
}

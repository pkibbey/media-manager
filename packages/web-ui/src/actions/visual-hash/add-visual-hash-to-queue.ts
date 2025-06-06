'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { createSupabase } from 'shared';
import { appConfig, serverEnv } from 'shared/env';
import type { ProcessType } from 'shared/types';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

const visualHashQueue = new Queue('visualHashQueue', { connection });

/**
 * Calculate priority for visual hash processing jobs
 * Higher numbers = higher priority (processed first)
 *
 * Priority factors:
 * - Has thumbnail: Items with thumbnails get higher priority
 * - File size: Smaller files get higher priority (faster processing)
 * - Media type: Images only (visual hashes are for images)
 */
function calculateVisualHashPriority(mediaItem: any): number {
  let priority = 0;

  // Base priority from file size (smaller files = higher priority)
  const sizeBytes = mediaItem.size_bytes || 0;
  if (sizeBytes > 0) {
    const sizeMB = sizeBytes / (1024 * 1024);
    priority += Math.max(0, 100 - Math.log10(sizeMB + 1) * 30);
  }

  // Thumbnail availability bonus (visual hash needs thumbnail)
  if (mediaItem.thumbnail_url) {
    priority += 20;
  }

  // Add small random component to break ties and distribute load
  priority += Math.random() * 5;

  return Math.round(priority);
}

export async function addToVisualHashQueue(
  method: ProcessType = 'standard',
): Promise<boolean> {
  const supabase = createSupabase();
  let offset = 0;
  const batchSize = 1000;

  try {
    while (true) {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select('id, thumbnail_url, size_bytes, media_types!inner(is_ignored)')
        .is('media_types.is_ignored', false)
        .is('is_deleted', false)
        .is('is_hidden', false)
        .ilike('media_types.mime_type', 'image/%') // Only process image types
        .not('thumbnail_url', 'is', null) // Only items with thumbnails
        .is('visual_hash', null) // Only items without visual hash
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching media items for visual hash:', error);
        return false;
      }

      if (!mediaItems || mediaItems.length === 0) {
        return false;
      }

      // Calculate priorities and create jobs
      const jobsWithPriorities = mediaItems.map((data) => {
        const priority = calculateVisualHashPriority(data);
        return {
          name: 'visual-hash-generation',
          data: {
            id: data.id,
            thumbnail_url: data.thumbnail_url,
            method,
          },
          opts: {
            jobId: `${data.id}-visual-hash`, // Use media ID as job ID for uniqueness
            priority,
          },
        };
      });

      await visualHashQueue.addBulk(jobsWithPriorities);

      offset += mediaItems.length;
      if (mediaItems.length < batchSize) {
        return false;
      }
    }
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Error in addToVisualHashQueue:', errorMessage);
    return false;
  }
}

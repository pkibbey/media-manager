'use server';

import { createSupabase } from 'shared';
import type { QueueName } from 'shared/types';
import { resetQueueState } from '../queue/reset-queue-state';

/**
 * Reset all queues by clearing all states
 *
 * @returns Boolean indicating success
 */
async function resetAllQueues(): Promise<boolean> {
  const queueNames: QueueName[] = [
    'folderScanQueue',
    'advancedAnalysisQueue',
    'duplicatesQueue',
    'contentWarningsQueue',
    'thumbnailQueue',
    'exifQueue',
    'objectAnalysisQueue',
    'fixImageDatesQueue',
    'blurryPhotosQueue',
  ];

  const statesToReset = [
    'waiting',
    'completed',
    'failed',
    'delayed',
    'paused',
  ] as const;

  try {
    console.log('Starting to reset all queues...');

    for (const queueName of queueNames) {
      for (const state of statesToReset) {
        await resetQueueState(queueName, state);
      }
    }

    console.log('Successfully reset all queues.');
    return true;
  } catch (error) {
    console.error('Error resetting queues:', error);
    return false;
  }
}

/**
 * Delete all media data
 *
 * @returns Boolean indicating success
 */
export async function deleteAllMediaItems(): Promise<boolean> {
  try {
    console.log('Starting deletion process: resetting all queues first...');

    // Reset all queues before deleting media items
    const queueResetSuccess = await resetAllQueues();
    if (!queueResetSuccess) {
      console.error('Failed to reset queues, aborting media deletion');
      return false;
    }

    const supabase = createSupabase();

    // Delete media items in batches until no more items are left
    while (true) {
      const { error: deleteError, count } = await supabase
        .from('media')
        .delete()
        .not('id', 'is', null);

      if (deleteError) {
        console.error('Error deleting media items:', deleteError);
        return false;
      }

      const affectedRows = count || 0;

      if (affectedRows === 0) {
        // Empty the storage bucket for thumbnails
        try {
          await supabase.storage.emptyBucket('thumbnails');
        } catch (e) {
          console.error('Exception while emptying thumbnails bucket:', e);
        }

        break;
      }
    }

    console.log('Finished deleting all media items.');
    return true;
  } catch (err) {
    console.error('Unexpected error during media items deletion:', err);
    return false;
  }
}

'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared';
import { appConfig, serverEnv } from 'shared/env';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

/**
 * Delete all EXIF data from the database and reset the EXIF queue
 *
 * @returns Boolean indicating success
 */
export async function deleteAllExifData(): Promise<boolean> {
  try {
    const supabase = createSupabase();
    let totalDeleted = 0;

    // Delete EXIF data records in batches until no more items are left
    while (true) {
      const { error: deleteError, count } = await supabase
        .from('exif_data')
        .delete()
        .not('id', 'is', null);

      if (deleteError) {
        console.error('Error deleting EXIF data:', deleteError);
        return false;
      }

      const affectedRows = count || 0;
      totalDeleted += affectedRows;

      console.log(
        `Successfully deleted ${affectedRows} EXIF records. Total deleted: ${totalDeleted}`,
      );

      if (affectedRows === 0) {
        break;
      }
    }

    // Reset the EXIF queue - clean all job states
    const queue = new Queue('exifQueue', { connection });

    // Clean all possible job states
    await Promise.all([
      queue.clean(0, 1000000, 'completed'),
      queue.clean(0, 1000000, 'failed'),
      queue.clean(0, 1000000, 'wait'),
      queue.clean(0, 1000000, 'prioritized'),
      queue.clean(0, 1000000, 'delayed'),
      queue.clean(0, 1000000, 'paused'),
    ]);

    console.log('Finished deleting all EXIF data and resetting the queue.');
    return true;
  } catch (error) {
    console.error('Error deleting all EXIF data:', error);
    return false;
  }
}

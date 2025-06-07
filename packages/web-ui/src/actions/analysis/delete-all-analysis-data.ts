'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSupabase } from 'shared';
import { appConfig, serverEnv } from 'shared/env';

const connection = new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
  maxRetriesPerRequest: null,
});

/**
 * Delete all analysis data from the database and reset related queues
 *
 * @returns Boolean indicating success
 */
export async function deleteAllAnalysisData(): Promise<boolean> {
  try {
    const supabase = createSupabase();
    let totalDeleted = 0;

    // Delete analysis data records in batches until no more items are left
    while (true) {
      const { error: deleteError, count } = await supabase
        .from('analysis_data')
        .delete()
        .not('id', 'is', null);

      if (deleteError) {
        console.error('Error deleting analysis data:', deleteError);
        return false;
      }

      const affectedRows = count || 0;
      totalDeleted += affectedRows;

      console.log(
        `Successfully deleted ${affectedRows} analysis records. Total deleted: ${totalDeleted}`,
      );

      if (affectedRows === 0) {
        break;
      }
    }

    // Reset the related queues - clean all job states
    const queues = [
      new Queue('advancedAnalysisQueue', { connection }),
      new Queue('objectAnalysisQueue', { connection }),
      new Queue('contentWarningsQueue', { connection }),
    ];

    // Clean all possible job states for all analysis-related queues
    for (const queue of queues) {
      await Promise.all([
        queue.clean(0, 1000000, 'completed'),
        queue.clean(0, 1000000, 'failed'),
        queue.clean(0, 1000000, 'delayed'),
        queue.clean(0, 1000000, 'wait'),
      ]);

      console.log(`Cleaned ${queue.name} queue`);
    }

    console.log(
      `Successfully deleted all analysis data and reset related queues. Total deleted: ${totalDeleted}`,
    );
    return true;
  } catch (error) {
    console.error('Error deleting all analysis data:', error);
    return false;
  }
}

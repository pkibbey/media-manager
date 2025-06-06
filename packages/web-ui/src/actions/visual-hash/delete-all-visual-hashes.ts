'use server';

import { createSupabase } from 'shared';
import { resetQueueState } from '../queue/reset-queue-state';

const statesToReset = [
  'waiting',
  'completed',
  'failed',
  'delayed',
  'paused',
] as const;

/**
 * Delete all visual hash data
 *
 * @returns Boolean indicating success
 */
export async function deleteAllVisualHashes(): Promise<boolean> {
  try {
    const supabase = createSupabase();

    // Clear visual_hash field for all media items
    const { error: updateError, count } = await supabase
      .from('media')
      .update({ visual_hash: null })
      .not('visual_hash', 'is', null);

    if (updateError) {
      console.error('Error deleting visual hash data:', updateError);
      return false;
    }

    const affectedRows = count || 0;
    console.log(
      `Successfully cleared visual hashes for ${affectedRows} media items`,
    );

    // Reset the visual hash queue states
    for (const state of statesToReset) {
      try {
        await resetQueueState('visualHashQueue', state);
        console.log(`Reset ${state} jobs in visualHashQueue`);
      } catch (error) {
        console.error(
          `Error resetting ${state} jobs in visualHashQueue:`,
          error,
        );
        // Continue with other states even if one fails
      }
    }

    console.log('Successfully deleted all visual hash data and reset queue');
    return true;
  } catch (error) {
    console.error('Error in deleteAllVisualHashes:', error);
    return false;
  }
}

'use server';

import { createSupabase } from 'shared/supabase';

/**
 * Delete analysis data and reset processing flags
 *
 * @returns Boolean indicating success
 */
export async function resetBasicData(): Promise<boolean> {
  try {
    const supabase = createSupabase();
    let totalReset = 0;

    // Reset is_basic_processed for all processed items in batches
    while (true) {
      const { error: updateError, count } = await supabase
        .from('media')
        .update({ is_basic_processed: false })
        .eq('is_basic_processed', true);

      if (updateError) {
        console.error('Failed to reset analysis data:', updateError);
        return false;
      }

      const affectedRows = count || 0;
      totalReset += affectedRows;

      console.log(
        `Successfully reset ${affectedRows} media items. Total reset: ${totalReset}`,
      );

      if (affectedRows === 0) {
        // No more items to update
        break;
      }
    }

    console.log('Finished resetting analysis data for media items.');
    return true;
  } catch (error) {
    console.error('Exception during update of media items:', error);
    return false;
  }
}

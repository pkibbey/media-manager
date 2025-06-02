'use server';
import { createSupabase } from '@/lib/supabase';

/**
 * Delete advanced analysis data and reset processing flags
 *
 * @returns Boolean indicating success
 */
export async function deleteAdvancedAnalysisData(): Promise<boolean> {
  try {
    const supabase = createSupabase();
    let totalReset = 0;

    // Reset is_advanced_processed for all processed items in batches
    while (true) {
      const { error: updateError, count } = await supabase
        .from('media')
        .update({ is_advanced_processed: false })
        .eq('is_advanced_processed', true);

      if (updateError) {
        console.error('Failed to reset advanced analysis data:', updateError);
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

    console.log('Finished resetting advanced analysis data for media items.');
    return true;
  } catch (error) {
    console.error('Exception during update of media items:', error);
    return false;
  }
}

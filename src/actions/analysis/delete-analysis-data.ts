'use server';

import { createSupabase } from '@/lib/supabase';

export default async function deleteAnalysisData(): Promise<boolean> {
  const supabase = createSupabase();
  // Empty the storage bucket for analysis data
  try {
    const { error: deleteBucketError } = await supabase
      .from('analysis_data')
      .delete()
      .not('id', 'is', null);
    if (deleteBucketError) {
      console.error('Failed to empty analysis_data bucket:', deleteBucketError);
      // Depending on requirements, you might want to return false here or just log
    }
  } catch (e) {
    console.error('Exception while emptying analysis_data bucket:', e);
  }

  // Reset is_basic_processed in batches
  const BATCH_SIZE = 100;
  let totalProcessed = 0;

  try {
    while (true) {
      const { data: itemsToUpdate, error: selectError } = await supabase
        .from('media')
        .select('id')
        .eq('is_basic_processed', true)
        .limit(BATCH_SIZE);

      if (selectError) {
        console.error('Failed to select media items for reset:', selectError);
        return false;
      }

      if (!itemsToUpdate || itemsToUpdate.length === 0) {
        // No more items to update
        break;
      }

      const idsToUpdate = itemsToUpdate.map((item) => item.id);

      const { error: updateError } = await supabase
        .from('media')
        .update({ is_basic_processed: false })
        .in('id', idsToUpdate);

      if (updateError) {
        console.error('Failed to reset batch of analysis data:', updateError);
        return false;
      }

      totalProcessed += itemsToUpdate.length;
      console.log(
        `Successfully reset ${itemsToUpdate.length} media items. Total reset: ${totalProcessed}`,
      );

      if (itemsToUpdate.length < BATCH_SIZE) {
        // Last batch was smaller than BATCH_SIZE, so we must be done.
        break;
      }
    }
  } catch (e) {
    console.error('Exception during batch update of media items:', e);
    return false;
  }

  console.log('Finished resetting analysis data for media items.');
  return true;
}

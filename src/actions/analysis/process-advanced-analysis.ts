'use server';

import { createSupabase } from '@/lib/supabase';
import processWithOllama from './process-wtih-ollama';

export async function processAdvancedAnalysis(limit = 10) {
  try {
    const supabase = createSupabase();

    // Find media items that need analysis processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('*')
      .eq('is_thumbnail_processed', true)
      .eq('is_advanced_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, processed: 0, message: 'No items to process' };
    }

    // Process items sequentially instead of in parallel
    // This helps manage memory better by not overloading
    let succeeded = 0;
    let failed = 0;
    let totalBatchProcessingTime = 0;

    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];

      try {
        const result = await processWithOllama({ mediaId: item.id });
        if (result.success) {
          succeeded++;
          totalBatchProcessingTime += result.processingTime || 0;
        } else {
          failed++;
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        failed++;
      }
    }

    return {
      success: true,
      processed: succeeded,
      failed,
      total: mediaItems.length,
      batchProcessingTime: totalBatchProcessingTime,
    };
  } catch (error) {
    console.error('Error in batch analysis processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
    };
  }
}

export async function deleteAdvancedAnalysisData() {
  const supabase = createSupabase();

  // Delete analysis data from the database
  return await supabase
    .from('media')
    .update({ is_advanced_processed: false })
    .not('id', 'is', null);
}

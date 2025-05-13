'use server';

import { createSupabase } from '@/lib/supabase';
import processWithOllama from './process-wtih-ollama';

export async function processAdvancedAnalysis(limit = 10) {
  try {
    const supabase = createSupabase();

    // Log initial memory usage
    const initialMemory = process.memoryUsage();
    console.log(
      `Initial memory usage: ${JSON.stringify({
        rss: `${Math.round(initialMemory.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(initialMemory.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
      })}`,
    );

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
      console.log(`Processing item ${i + 1}/${mediaItems.length}`);

      try {
        const result = await processWithOllama({ mediaId: item.id });
        if (result.success) {
          succeeded++;
          totalBatchProcessingTime += result.processingTime || 0;
        } else {
          failed++;
        }

        // Log memory usage after each item
        const currentMemory = process.memoryUsage();
        console.log(
          `Memory after item ${i + 1}: ${JSON.stringify({
            rss: `${Math.round(currentMemory.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(currentMemory.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
          })}`,
        );

        // Add a small delay between processing to allow for GC
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Hint to the JavaScript engine to perform garbage collection
        if (global.gc) {
          try {
            global.gc();
            console.log('Garbage collection performed');
          } catch (_e) {
            console.log(
              'Failed to perform garbage collection - run with --expose-gc flag',
            );
          }
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        failed++;
      }
    }

    // Log final memory usage
    const finalMemory = process.memoryUsage();
    console.log(
      `Final memory usage: ${JSON.stringify({
        rss: `${Math.round(finalMemory.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(finalMemory.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
      })}`,
    );

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

export async function getAdvancedAnalysisStats() {
  const supabase = createSupabase();

  try {
    // Get total media items
    const { count: total, error: totalError } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      return {
        error: totalError.message,
      };
    }

    // Get processed media items
    const { count: processed, error: processedError } = await supabase
      .from('analysis_data')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_type', 'advanced');

    if (processedError) {
      return {
        error: processedError.message,
      };
    }

    // Calculate remaining and percentage
    const remaining = (total || 0) - (processed || 0);
    const percentComplete = total
      ? Math.round(((processed || 0) * 100) / total)
      : 0;

    return {
      stats: {
        total: total || 0,
        processed: processed || 0,
        remaining,
        percentComplete,
      },
    };
  } catch (error) {
    console.error('Error getting advanced analysis stats:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteAdvancedAnalysisData() {
  const supabase = createSupabase();

  try {
    const { error, count } = await supabase
      .from('analysis_data')
      .delete({ count: 'exact' })
      .eq('type', 'advanced');

    if (error) {
      return { error };
    }

    return { success: true, count };
  } catch (error) {
    console.error('Error deleting advanced analysis data:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

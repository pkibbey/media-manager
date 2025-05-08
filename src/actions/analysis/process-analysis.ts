'use server';
'@/lib/consts';

import { createServer } from '@/lib/supabase';
import analyzeImageWithVisionModel from './ollama';

/**
 *
 * @param mediaId - The ID of the media item to analyze
 * @returns Object with success status and any error message
 */
export async function processAnalysis(mediaId: string) {
  try {
    const supabase = createServer();

    // Get the media item
    const { data: mediaItem, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (mediaError || !mediaItem) {
      throw new Error(
        `Failed to find media item: ${mediaError?.message || 'Not found'}`,
      );
    }

    const { data, error } = await analyzeImageWithVisionModel(
      mediaItem.media_path,
    );
    if (error) {
      throw new Error(`Failed to analyze image: ${error}`);
    }
    console.log('data: ', data);
  } catch (error) {
    console.error('Error in analysis processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process analysis for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @returns Object with count of processed items and any errors
 */
export async function processBatchAnalysis(limit = 10) {
  try {
    const supabase = createServer();

    // Find media items that need analysis processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('id')
      .eq('analysis_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, processed: 0, message: 'No items to process' };
    }

    // Process each item
    const results = await Promise.allSettled(
      mediaItems.map((item) => processAnalysis(item.id)),
    );

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value?.success,
    ).length;
    const failed = results.length - succeeded;

    return {
      success: true,
      processed: succeeded,
      failed,
      total: results.length,
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

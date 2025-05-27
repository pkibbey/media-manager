'use server';

import * as tf from '@tensorflow/tfjs-node';
import { load } from 'nsfwjs';
import { processInChunks } from '@/lib/batch-processing';
import { DEFAULT_CONCURRENCY } from '@/lib/consts';
import { createSupabase } from '@/lib/supabase';
import type { MediaWithRelations } from '@/types/media-types';
import type { TablesInsert } from '@/types/supabase';

/**
 * Process content warnings for a batch of media items
 * Saves the results to the analysis_data table and marks media as processed
 *
 * @param limit - Maximum number of items to process
 * @param concurrency - Number of concurrent processing tasks
 * @returns BatchResult object with success/failure information
 */
export async function processContentWarnings(limit = 10, concurrency = 3) {
  try {
    const startTime = Date.now();
    const supabase = createSupabase();

    // Find unprocessed media items that have thumbnails but don't have content warnings yet
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('*')
      .eq('is_thumbnail_processed', true)
      .eq('is_content_warnings_processed', false) // Only get items that haven't been processed for content warnings
      .not('thumbnail_url', 'is', null)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        total: 0,
        message: 'No items to process',
      };
    }

    console.log(`Processing content warnings for ${mediaItems.length} items`);

    // Process the content warnings
    const results = await processBatchForContentWarnings(
      mediaItems as MediaWithRelations[],
      concurrency,
    );

    // Prepare data for batch database operations
    const analysisDataToUpdate: TablesInsert<'analysis_data'>[] = [];
    const mediaIdsToUpdate: string[] = [];
    let failed = 0;

    // Process results
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('Failed to process content warnings:', result.reason);
        failed++;
      } else if (result.value.error || !result.value.content_warnings) {
        console.error(
          `Failed to process content warnings for ${result.value.mediaItemId}:`,
          result.value.error,
        );
        failed++;
      } else {
        // Add to batch update arrays
        analysisDataToUpdate.push({
          media_id: result.value.mediaItemId,
          content_warnings: result.value.content_warnings,
        });
        mediaIdsToUpdate.push(result.value.mediaItemId);
      }
    });

    // Perform batch database operations
    // 1. Insert or update analysis data
    if (analysisDataToUpdate.length > 0) {
      const { error: insertError } = await supabase
        .from('analysis_data')
        .upsert(analysisDataToUpdate, {
          onConflict: 'media_id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        throw new Error(
          `Failed to update analysis data: ${insertError.message}`,
        );
      }
    }

    // 2. Mark media items as processed
    if (mediaIdsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('media')
        .update({ is_content_warnings_processed: true })
        .in('id', mediaIdsToUpdate);

      if (updateError) {
        throw new Error(
          `Failed to update media status: ${updateError.message}`,
        );
      }
    }

    const totalTime = Date.now() - startTime;
    const processed = mediaIdsToUpdate.length;

    return {
      success: true,
      processed,
      failed,
      total: mediaItems.length,
      batchProcessingTime: totalTime,
      message: `Processed ${processed} items with content warnings (${failed} failed)`,
    };
  } catch (error) {
    console.error('Error processing content warnings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      failed: 0,
      processed: 0,
      total: 0,
      message: 'Content warnings processing failed',
    };
  }
}

/**
 * Process a batch of media items for Content Warnings detection using TensorFlow
 * This is a helper function that performs the actual content warnings detection
 */
export async function processBatchForContentWarnings(
  mediaItems: MediaWithRelations[],
  concurrency = DEFAULT_CONCURRENCY,
) {
  const model = await load('InceptionV3');

  // Process a single media item for content warnings
  const processContentWarnings = async (mediaItem: MediaWithRelations) => {
    try {
      // Fetch the image buffer (use thumbnail for speed)
      const imageResponse = await fetch(mediaItem.thumbnail_url || '');
      const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

      // Decode JPEG
      const tensor = tf.node.decodeJpeg(imageBuffer, 3);

      // Run Content Warnings detection
      const predictions = await model.classify(tensor);

      tensor.dispose();

      return {
        mediaItemId: mediaItem.id,
        content_warnings: predictions,
      };
    } catch (err) {
      return {
        mediaItemId: mediaItem.id,
        error: err instanceof Error ? err.message : 'An unknown error occurred',
      };
    }
  };

  const extractionResults = await processInChunks(
    mediaItems,
    processContentWarnings,
    concurrency,
  );

  return extractionResults;
}

/**
 * Delete all content warnings data and reset processing flags
 */
export async function deleteContentWarningsData() {
  const supabase = createSupabase();

  // Update the media table to reset content warnings processing flags
  const result = await supabase
    .from('media')
    .update({ is_content_warnings_processed: false })
    .not('id', 'is', null);

  // Note: We don't delete from analysis_data as that would remove other analysis data
  // Instead, other processes should check is_content_warnings_processed flag

  return result;
}

'use server';

import * as tf from '@tensorflow/tfjs-node';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { DEFAULT_CONCURRENCY } from '@/lib/consts';
import { createSupabase } from '@/lib/supabase';
import type { MediaWithRelations } from '@/types/media-types';

const CONFIDENCE_THRESHOLD = 0.7; // Set a default confidence threshold
const MAX_BOXES = 5; // Maximum number of boxes to detect

// Cache for the model to avoid reloading
let cachedModel: cocoSsd.ObjectDetection | null = null;

/**
 * Initialize TensorFlow and load the model, with caching
 */
async function initTensorFlowAndLoadModel() {
  if (cachedModel) {
    return cachedModel;
  }

  // tf-node will automatically use the best available hardware
  // Metal GPU will be used on M-series Macs if TF_METAL_DEVICE=1 is set
  await tf.ready();

  // Load the COCO-SSD model (MobileNet v2)
  const model = await cocoSsd.load({
    base: 'mobilenet_v2',
    modelUrl: undefined,
  });

  cachedModel = model;
  return model;
}

/**
 * Process a batch of media items for object detection efficiently
 * - Loads the model once for the entire batch
 * - Processes multiple items concurrently
 * - Manages memory efficiently
 * - Uses grouped database operations for optimal performance
 */
export async function processBatchForObjects(
  mediaItems: MediaWithRelations[],
  concurrency = DEFAULT_CONCURRENCY,
) {
  const batchStartTime = Date.now();

  try {
    // Initialize TF and load model once for all items
    const model = await initTensorFlowAndLoadModel();

    // Process items with controlled concurrency (CPU-intensive work first)
    const results = [];
    for (let i = 0; i < mediaItems.length; i += concurrency) {
      const chunk = mediaItems.slice(i, i + concurrency);

      // Process this chunk in parallel
      const chunkPromises = chunk.map(async (mediaItem) => {
        const itemStartTime = Date.now();
        try {
          // Check if already processed
          if (mediaItem.analysis_data?.objects?.length) {
            return {
              mediaItemId: mediaItem.id,
              success: true,
              processingTime: 0,
              message: 'Already processed',
              objectCount: mediaItem.analysis_data.objects.length,
              analysisData: null, // No new data to save
            };
          }

          // Fetch and process the image
          const imageResponse = await fetch(mediaItem.thumbnail_url || '');
          const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

          // Use tf.node.decodeJpeg since we know thumbnails are always in JPEG format
          const tensor = tf.node.decodeJpeg(imageBuffer, 3);

          // Run object detection
          const predictions = await model.detect(
            tensor,
            MAX_BOXES,
            CONFIDENCE_THRESHOLD,
          );

          // Clean up right away
          tensor.dispose();

          const itemEndTime = Date.now();
          return {
            mediaItemId: mediaItem.id,
            success: true,
            processingTime: itemEndTime - itemStartTime,
            objectCount: predictions.length,
            analysisData: {
              media_id: mediaItem.id,
              objects: predictions, // Store the original COCO-SSD format
            },
          };
        } catch (error) {
          console.error(`Error processing item ${mediaItem.id}:`, error);
          return {
            mediaItemId: mediaItem.id,
            success: false,
            processingTime: Date.now() - itemStartTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            analysisData: null,
          };
        }
      });

      // Wait for current chunk to complete
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Force garbage collection between chunks
      tf.disposeVariables();
      if (global.gc) {
        global.gc();
      }
    }

    // Prepare grouped database operations
    const supabase = createSupabase();
    const analysisDataToInsert: Array<{ media_id: string; objects: any[] }> =
      [];
    const mediaIdsToUpdate: string[] = [];
    let failed = 0;

    // Process results and prepare batch operations
    results.forEach((result) => {
      if (result.success) {
        mediaIdsToUpdate.push(result.mediaItemId);
        if (result.analysisData) {
          analysisDataToInsert.push(result.analysisData);
        }
      } else {
        failed++;
      }
    });

    // Perform grouped database operations
    // 1. Insert analysis data in batches if there are any to insert
    if (analysisDataToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('analysis_data')
        .upsert(analysisDataToInsert, {
          onConflict: 'media_id',
        });

      if (insertError) {
        throw new Error(
          `Failed to batch insert analysis data: ${insertError.message}`,
        );
      }
    }

    // 2. Update all processed media items in a single operation
    if (mediaIdsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('media')
        .update({ is_basic_processed: true })
        .in('id', mediaIdsToUpdate);

      if (updateError) {
        throw new Error(
          `Failed to batch update media items: ${updateError.message}`,
        );
      }
    }

    const batchEndTime = Date.now();
    const totalProcessingTime = batchEndTime - batchStartTime;
    const successCount = results.filter((r) => r.success).length;

    return {
      success: true,
      batchResults: results,
      totalProcessingTime,
      processedCount: successCount,
      failedCount: failed,
    };
  } catch (error) {
    console.error('Batch processing error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown batch processing error',
      totalProcessingTime: Date.now() - batchStartTime,
      processedCount: 0,
      failedCount: mediaItems.length,
    };
  }
}

/**
 * Clear the model cache to free memory
 * Call this when finished with a large processing job
 */
export async function clearModelCache() {
  if (cachedModel) {
    cachedModel = null;
    tf.disposeVariables();
    if (global.gc) {
      global.gc();
    }
  }
}

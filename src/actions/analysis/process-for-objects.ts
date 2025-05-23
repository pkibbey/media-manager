'use server';

import * as tf from '@tensorflow/tfjs-node';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { MediaWithRelations } from '@/types/media-types';
import { saveDetectedObjects } from './save-detected-objects';
import { setMediaAsBasicAnalysisProcessed } from './set-media-as-analysis-processed';

const CONFIDENCE_THRESHOLD = 0.7; // Set a default confidence threshold

// Number of items to process in parallel - adjust based on memory and GPU capacity
// M3 MacBook Air should handle 3-4 concurrent items well
const DEFAULT_CONCURRENCY = 3;

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
  console.log('TensorFlow.js initialized with backend:', tf.getBackend());

  // Load the COCO-SSD model (MobileNet v2)
  const model = await cocoSsd.load({
    base: 'mobilenet_v2',
    modelUrl: undefined,
  });

  cachedModel = model;
  return model;
}

/**
 * Process a single media item for object detection
 */
export async function processForObjects(mediaItem: MediaWithRelations) {
  console.log('has objects: ', !!mediaItem.analysis_data?.objects.length);
  const startTime = Date.now();

  try {
    // Use shared model initialization
    const model = await initTensorFlowAndLoadModel();

    // Fetch the image
    const imageResponse = await fetch(
      mediaItem.thumbnail_data?.thumbnail_url || '',
    );

    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
    // Use tf.node.decodeJpeg since we know thumbnails are always in JPEG format
    // This is more efficient than using the generic decodeImage
    const tensor = tf.node.decodeJpeg(imageBuffer, 3, 1, false, false);

    // Run object detection
    const predictions = await model.detect(tensor, CONFIDENCE_THRESHOLD);

    // Clean up the tensor to free memory
    tensor.dispose();

    // Save detected objects to database using original COCO-SSD format
    const { error: upsertError } = await saveDetectedObjects(
      mediaItem,
      predictions,
    );

    if (upsertError) {
      throw new Error(
        `Failed to upsert analysis data: ${(upsertError as Error).message}`,
      );
    }

    // Mark as processed
    const { error: updateError } = await setMediaAsBasicAnalysisProcessed(
      mediaItem.id,
    );

    if (updateError) {
      throw new Error(`Failed to update media status: ${updateError.message}`);
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    return {
      success: true,
      processingTime,
      objectCount: predictions.length,
    };
  } catch (error) {
    console.error('Error in local object detection:', error);
    throw new Error(
      `Failed to process image for objects: ${(error as Error).message}`,
    );
  }
}

/**
 * Process a batch of media items for object detection efficiently
 * - Loads the model once for the entire batch
 * - Processes multiple items concurrently
 * - Manages memory efficiently
 */
export async function processBatchForObjects(
  mediaItems: MediaWithRelations[],
  concurrency = DEFAULT_CONCURRENCY,
) {
  console.log(
    `Processing batch of ${mediaItems.length} items with concurrency ${concurrency}`,
  );
  const batchStartTime = Date.now();

  try {
    // Initialize TF and load model once for all items
    const model = await initTensorFlowAndLoadModel();

    // Process items with controlled concurrency
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
            };
          }

          // Fetch and process the image
          const imageResponse = await fetch(
            mediaItem.thumbnail_data?.thumbnail_url || '',
          );
          const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

          // Use tf.node.decodeJpeg since we know thumbnails are always in JPEG format
          // This is more efficient than using the generic decodeImage
          const tensor = tf.node.decodeJpeg(imageBuffer, 3);

          // Run object detection
          const predictions = await model.detect(tensor, CONFIDENCE_THRESHOLD);

          // Clean up right away
          tensor.dispose();

          // Save to database - using original COCO-SSD format
          const { error: upsertError } = await saveDetectedObjects(
            mediaItem,
            predictions,
          );

          if (upsertError) {
            throw new Error(
              `Failed to upsert: ${(upsertError as Error).message}`,
            );
          }

          // Mark as processed
          const { error: updateError } = await setMediaAsBasicAnalysisProcessed(
            mediaItem.id,
          );

          if (updateError) {
            throw new Error(`Failed to update status: ${updateError.message}`);
          }

          const itemEndTime = Date.now();
          return {
            mediaItemId: mediaItem.id,
            success: true,
            processingTime: itemEndTime - itemStartTime,
            objectCount: predictions.length,
          };
        } catch (error) {
          console.error(`Error processing item ${mediaItem.id}:`, error);
          return {
            mediaItemId: mediaItem.id,
            success: false,
            processingTime: Date.now() - itemStartTime,
            error: error instanceof Error ? error.message : 'Unknown error',
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

    const batchEndTime = Date.now();
    const totalProcessingTime = batchEndTime - batchStartTime;
    const successCount = results.filter((r) => r.success).length;

    return {
      success: true,
      batchResults: results,
      totalProcessingTime,
      processedCount: successCount,
      failedCount: results.length - successCount,
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
    console.log('Model cache cleared');
  }
}

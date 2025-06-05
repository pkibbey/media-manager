'use server';

import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs-node';
import { createSupabase } from 'shared';
import type { Json } from 'shared/types';

// Save COCO-SSD model variable in the global scope
// to avoid reloading it for every job, which can be expensive.
let model: cocoSsd.ObjectDetection | null = null;

/**
 * Loads the COCO-SSD model if it hasn't been loaded yet.
 */
async function initializeModel() {
  if (!model) {
    console.log('Loading COCO-SSD model...');
    await tf.ready();
    model = await cocoSsd.load();
    console.log('COCO-SSD model loaded successfully.');
  }
}

/**
 * Fetches an image from a URL and converts it to a TensorFlow tensor.
 * @param url The URL of the image.
 * @returns A Promise resolving to a tf.Tensor3D.
 */
async function loadImage(url: string): Promise<tf.Tensor3D> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch image from ${url}: ${response.statusText}`,
    );
  }
  const buffer = await response.arrayBuffer();

  // Decode the image buffer into a tensor
  const imageTensor = tf.node.decodeJpeg(new Uint8Array(buffer), 3);
  return imageTensor;
}

/**
 * Process object detection for a media item
 * @param params - Object containing processing parameters
 * @param params.mediaId - The ID of the media item to process
 * @param params.thumbnailUrl - The URL of the thumbnail to analyze
 * @returns Promise<boolean> - Success status
 */
export async function processObjectDetection({
  mediaId,
  thumbnailUrl,
}: {
  mediaId: string;
  thumbnailUrl: string;
}): Promise<boolean> {
  const supabase = createSupabase();

  await initializeModel();
  if (!model) {
    throw new Error('COCO-SSD model is not loaded.');
  }

  let imageTensor: tf.Tensor3D | undefined;
  try {
    // Load the image from the thumbnail URL
    imageTensor = await loadImage(thumbnailUrl);

    // Perform object detection
    const predictions = await model.detect(imageTensor);

    // Save detection results
    const { error: upsertError } = await supabase.from('analysis_data').upsert(
      {
        media_id: mediaId,
        objects: predictions as unknown as Json[],
      },
      { onConflict: 'media_id' },
    );

    if (upsertError) {
      throw new Error(
        `Failed to save analysis data for media ID ${mediaId}: ${upsertError.message}`,
      );
    }

    return true;
  } catch (error) {
    console.error('Error processing object detection:', error);
    throw error;
  } finally {
    if (imageTensor) {
      imageTensor.dispose(); // IMPORTANT: Clean up tensor memory
    }
  }
}

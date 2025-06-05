'use server';

import tf from '@tensorflow/tfjs-node';
import { load } from 'nsfwjs';
import { createSupabase } from 'shared';
import type { Json } from 'shared/types';

// Save NSFWJS model variable in the global scope
// to avoid reloading it for every job, which can be expensive.
let model: any = null;

/**
 * Loads the NSFWJS model if it hasn't been loaded yet.
 */
async function initializeModel() {
  if (!model) {
    console.log('Loading NSFWJS model...');
    await tf.ready();
    model = await load('InceptionV3');
    console.log('NSFWJS model loaded successfully.');
  }
}

/**
 * Process content warnings detection for a media item
 * @param params - Object containing processing parameters
 * @param params.mediaId - The ID of the media item to process
 * @param params.thumbnailUrl - The URL of the thumbnail to analyze
 * @returns Promise<boolean> - Success status
 */
export async function processContentWarnings({
  mediaId,
  thumbnailUrl,
}: {
  mediaId: string;
  thumbnailUrl: string;
}): Promise<boolean> {
  const supabase = createSupabase();

  await initializeModel();
  if (!model) {
    throw new Error('NSFWJS model is not loaded.');
  }

  let tensor: tf.Tensor3D | undefined;
  try {
    // Fetch the image buffer (use thumbnail for speed)
    const imageResponse = await fetch(thumbnailUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch image from ${thumbnailUrl}: ${imageResponse.statusText}`,
      );
    }
    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

    // Decode JPEG
    tensor = tf.node.decodeJpeg(imageBuffer, 3);

    // Run Content Warnings detection
    const predictions = await model.classify(tensor);

    // Save detection results
    const { error: upsertError } = await supabase.from('analysis_data').upsert(
      {
        media_id: mediaId,
        content_warnings: predictions as unknown as Json[],
      },
      { onConflict: 'media_id' },
    );

    if (upsertError) {
      throw new Error(
        `Failed to save content warnings data for media ID ${mediaId}: ${upsertError.message}`,
      );
    }

    return true;
  } catch (error) {
    console.error('Error processing content warnings:', error);
    throw error;
  } finally {
    if (tensor) {
      tensor.dispose(); // IMPORTANT: Clean up tensor memory
    }
  }
}

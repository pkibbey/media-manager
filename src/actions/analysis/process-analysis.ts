'use server';

import ollama from 'ollama';
import { v4 } from 'uuid';
import zodToJsonSchema from 'zod-to-json-schema';
import { VISION_MODEL } from '@/lib/consts';
import { createSupabase } from '@/lib/supabase';
import { ImageDescriptionSchema } from '@/types/analysis';

/**
 * Mark a media item as having its thumbnail processed
 *
 * @param mediaId - The ID of the media item to mark
 * @param thumbnailUrl - Optional URL to the generated thumbnail
 * @returns Object with success or error information
 */
async function setMediaAsAnalysisProcessed(mediaId: string) {
  const supabase = createSupabase();

  const { error } = await supabase
    .from('media')
    .update({ is_analysis_processed: true })
    .eq('id', mediaId);

  if (error) {
    console.error(
      `Error marking media ${mediaId} as analysis processed:`,
      error,
    );
    return { success: false, error };
  }

  return { success: true };
}

/**
 * Process AI analysis for a single media item
 *
 * @param mediaId - The ID of the media item to analyze
 * @returns Object with success status and any error message
 */
export async function processAnalysis(mediaId: string) {
  try {
    const supabase = createSupabase();

    // Get the media item
    const { data: mediaItem, error: mediaError } = await supabase
      .from('media')
      .select('*, thumbnail_data(*)')
      .eq('id', mediaId)
      .is('is_thumbnail_processed', true) // Ensure thumbnail is processed
      .single();

    if (mediaError || !mediaItem) {
      throw new Error(
        `Failed to find media item: ${mediaError?.message || 'Not found'}`,
      );
    }

    if (!mediaItem.thumbnail_data?.thumbnail_url) {
      throw new Error('Thumbnail URL is missing in media item');
    }

    try {
      // Fetch the image from the URL
      const imageResponse = await fetch(mediaItem.thumbnail_data.thumbnail_url);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to fetch thumbnail: ${imageResponse.statusText}`,
        );
      }

      // Convert the image to base64
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      // Convert the Zod schema to JSON Schema format
      const jsonSchema = zodToJsonSchema(ImageDescriptionSchema);

      const messages = [
        {
          role: 'user',
          content:
            'Analyze this image and return a detailed JSON description including objects, scene, colors and any text detected. If you cannot determine certain details, leave those fields empty.',
          images: [base64Image],
        },
      ];

      const startTime = performance.now();

      // Call Ollama for analysis
      const response = await ollama.chat({
        model: VISION_MODEL,
        messages,
        format: jsonSchema,
        options: {
          temperature: 0,
        },
      });

      // Parse and validate the response from Ollama
      const analysisResult = ImageDescriptionSchema.parse(
        JSON.parse(response.message.content),
      );

      const endTime = performance.now();
      const processingTimeInSeconds = Math.round((endTime - startTime) / 1000);
      console.log(
        `Analysis processing time for ${VISION_MODEL}: ${processingTimeInSeconds} seconds`,
      );

      console.log('analysisResult: ', analysisResult);

      // Store the analysis results
      const { error: insertError } = await supabase
        .from('analysis_data')
        .upsert(
          {
            id: v4(),
            media_id: mediaId,
            created_date: new Date().toISOString(),
            ...analysisResult,
          },
          {
            onConflict: 'media_id',
          },
        );

      if (insertError) {
        throw new Error(
          `Failed to insert analysis data: ${insertError.message}`,
        );
      }

      // Update the media item with the thumbnail URL
      const { error: updateError } = await setMediaAsAnalysisProcessed(
        mediaItem.id,
      );

      if (updateError) {
        throw new Error(
          `Failed to update media item with analysis processed: ${updateError.message}`,
        );
      }

      return { success: true };
    } catch (processingError) {
      console.error(
        `Error processing analysis for media ${mediaId}:`,
        processingError,
      );
      return {
        success: false,
        error:
          processingError instanceof Error
            ? processingError.message
            : 'Unknown processing error',
      };
    }
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
    const supabase = createSupabase();

    // Find media items that need analysis processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('id')
      .eq('is_analysis_processed', false)
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
      (r) => r.status === 'fulfilled' && r.value.success,
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

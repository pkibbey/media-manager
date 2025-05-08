'use server';

import { readFileSync } from 'node:fs';
import ollama from 'ollama';
import { VISION_MODEL } from '@/lib/consts';
import { createServer } from '@/lib/supabase';
import { ImageDescriptionSchema } from '@/types/analysis';

/**
 * Process AI analysis for a single media item
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

    try {
      // Read the image file
      const imageBuffer = readFileSync(mediaItem.media_path);
      const base64Image = imageBuffer.toString('base64');

      // Call Ollama for analysis
      const response = await ollama.chat({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content:
              'Analyze this image and return a detailed JSON description including objects, scene, colors and any text detected. If you cannot determine certain details, leave those fields empty.',
            images: [base64Image],
          },
        ],
        format: 'json',
        options: {
          temperature: 0,
        },
      });

      // Parse and validate the response
      const analysisResult = ImageDescriptionSchema.parse(
        JSON.parse(response.message.content),
      );

      // Store the analysis results
      const { error: insertError } = await supabase
        .from('analysis_results')
        .upsert(
          {
            id: crypto.randomUUID(),
            media_id: mediaId,
            image_description: analysisResult.summary,
            objects: analysisResult.objects,
            scene_types: [analysisResult.scene],
            colors: analysisResult.colors,
            tags: [analysisResult.time_of_day, analysisResult.setting],
            sentiment: 0,
            quality_score: 0,
            safety_level: 1,
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
    const supabase = createServer();

    // Find media items that need analysis processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('id')
      .eq('is_analyzed', false)
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

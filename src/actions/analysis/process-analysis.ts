'use server';

import { env } from '@xenova/transformers';
import { v4 } from 'uuid';
import {
  getCaptioner,
  getObjectDetector,
  getSafetyLevelDetector,
  getSentimentAnalyzer,
} from '@/lib/analysis-models';
import { createSupabase } from '@/lib/supabase';
import { ImageDescriptionSchema } from '@/types/analysis';
import extractDominantColors from './extract-dominant-colors';
import { setMediaAsAnalysisProcessed } from './set-media-as-analysis-processed';

// Configure Transformers environment for processing
env.backends.onnx.preferredBackend = 'webnn'; // Try to use Neural Engine if available
env.backends.onnx.numThreads = 4; // Set number of threads to 4

/**
 * Process AI analysis for a single media item
 *
 * @param mediaId - The ID of the media item to analyze
 * @returns Object with success status and any error message
 */
export async function processAnalysis(mediaId: string) {
  const supabase = createSupabase();
  const startTime = Date.now(); // Record start time

  try {
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

    // Access thumbnail_data as it's returned as an array but we only need the first item
    const thumbnailData = Array.isArray(mediaItem.thumbnail_data)
      ? mediaItem.thumbnail_data[0]
      : mediaItem.thumbnail_data;

    const imageUrl = thumbnailData?.thumbnail_url;

    if (!imageUrl) {
      throw new Error('Thumbnail URL is missing in media item');
    }

    try {
      // Load specialized models - note we don't need to keep references since they're cached
      const [
        sentimentAnalyzer,
        objectDetector,
        captioner,
        safetyLevelDetector,
      ] = await Promise.all([
        getSentimentAnalyzer(),
        getObjectDetector(),
        getCaptioner(),
        getSafetyLevelDetector(),
      ]);

      // Process one model at a time to reduce peak memory usage
      console.log(`Processing caption for media ${mediaId}`);
      const captionResult = await captioner(imageUrl);

      console.log(`Processing objects for media ${mediaId}`);
      const objectResults = await objectDetector(imageUrl, { topk: 5 });

      console.log(`Processing safety level for media ${mediaId}`);
      const safetyLevelResult = await safetyLevelDetector(imageUrl);

      console.log(`Processing sentiment for media ${mediaId}`);
      const sentimentResult = await sentimentAnalyzer(
        captionResult[0].generated_text,
      );

      console.log(`Processing colors for media ${mediaId}`);
      const colors = await extractDominantColors(imageUrl);

      // Combine results to match your schema
      const analysisResult = ImageDescriptionSchema.parse({
        image_description: captionResult[0].generated_text,
        objects: objectResults || [],
        scene_types: [],
        colors: colors || [],
        text: '', // Placeholder for text detection if added later
        confidence_score: 0,
        sentiments: sentimentResult,
        safety_levels: safetyLevelResult,
        tags: [],
        quality_score: 0,
      });

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

      const endTime = Date.now(); // Record end time
      const processingTime = endTime - startTime; // Calculate processing time

      return { success: true, processingTime };
    } catch (processingError) {
      console.error(
        `Error processing analysis for media ${mediaId}:`,
        processingError,
      );
      const endTime = Date.now(); // Record end time
      const processingTime = endTime - startTime; // Calculate processing time

      return {
        success: false,
        error:
          processingError instanceof Error
            ? processingError.message
            : 'Unknown processing error',
        processingTime,
      };
    }
  } catch (error) {
    console.error('Error in analysis processing:', error);
    const endTime = Date.now(); // Record end time
    const processingTime = endTime - startTime; // Calculate processing time

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    };
  } finally {
    // Hint the garbage collector to run
    if (global.gc) {
      try {
        global.gc();
      } catch (_e) {
        // Ignore if gc is not available
      }
    }
  }
}

'use server';

import path from 'node:path';
import { getMediaItemById } from '@/actions/media/get-media-item-by-id';
import {
  markProcessingError,
  markProcessingSuccess,
} from '@/lib/processing-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { Method } from '@/types/unified-stats';

/**
 * Process a single image for keyword analysis using a placeholder method
 */
export async function processImageAnalysis({
  mediaId,
  method,
  progressCallback,
}: {
  mediaId: string;
  method: Method;
  progressCallback?: (message: string) => void;
}): Promise<{
  success: boolean;
  message: string;
  keywords?: string[];
  objects?: string[];
  sceneType?: string;
  colors?: string[];
}> {
  try {
    // Get the media item to access its file path
    const { data: mediaItem, error: fetchError } =
      await getMediaItemById(mediaId);

    if (fetchError || !mediaItem) {
      const errorMessage = fetchError?.message || 'Media item not found';

      await markProcessingError({
        mediaItemId: mediaId,
        progressType: 'analysis',
        errorMessage,
      });

      return {
        success: false,
        message: errorMessage,
      };
    }

    let analysisResult: {
      keywords: string[];
      objects: string[];
      sceneType: string;
      colors: string[];
    };

    try {
      // Perform placeholder image analysis
      analysisResult = await analyzeImagePlaceholder(
        mediaItem.file_path,
        method,
      );
    } catch (_analysisError) {
      // Fallback to basic simulated analysis if placeholder fails (unlikely but good practice)
      analysisResult = await simulateImageAnalysis(mediaItem.file_path, method);
    }

    // Store the results in the database
    const supabase = createServerSupabaseClient();
    const { error: upsertError } = await supabase
      .from('image_analysis')
      .upsert({
        media_item_id: mediaId,
        keywords: analysisResult.keywords,
        objects: analysisResult.objects,
        scene_type: analysisResult.sceneType,
        colors: analysisResult.colors,
        processing_state: 'completed', // Mark as completed even though it's placeholder
        processing_completed: new Date().toISOString(),
      });

    if (upsertError) {
      const errorMessage = `Failed to store analysis results: ${upsertError.message}`;

      await markProcessingError({
        mediaItemId: mediaId,
        progressType: 'analysis',
        errorMessage,
      });

      return {
        success: false,
        message: errorMessage,
      };
    }

    // Mark processing as successful
    await markProcessingSuccess({
      mediaItemId: mediaId,
      progressType: 'analysis',
      errorMessage: 'Image analysis completed (placeholder)',
    });

    progressCallback?.('Analysis completed successfully (placeholder)');

    return {
      success: true,
      message: 'Image analysis completed successfully (placeholder)',
      ...analysisResult,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error during image analysis';

    // Use our helper function for error processing
    await markProcessingError({
      mediaItemId: mediaId,
      progressType: 'analysis',
      errorMessage,
    });

    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Placeholder function to replace analyzeImageWithOpenCV
 * Returns simulated data based on the filename and method.
 */
async function analyzeImagePlaceholder(
  filePath: string,
  method: Method,
): Promise<{
  keywords: string[];
  objects: string[];
  sceneType: string;
  colors: string[];
}> {
  // Use the existing simulateImageAnalysis function as the placeholder
  const result = await simulateImageAnalysis(filePath, method);

  // Add a specific keyword to indicate placeholder usage
  result.keywords.push('placeholder-analysis');

  return {
    ...result,
    keywords: [...new Set(result.keywords)], // Ensure uniqueness
  };
}

/**
 * Fallback function to simulate image analysis results
 * Used when OpenCV processing fails OR as the main placeholder logic now.
 */
async function simulateImageAnalysis(
  filePath: string,
  method: Method,
): Promise<{
  keywords: string[];
  objects: string[];
  sceneType: string;
  colors: string[];
}> {
  // Extract filename as a simple way to vary results for testing
  const fileName = path.basename(filePath, path.extname(filePath));

  // Generate some test keywords based on the method and filename
  const keywords = [
    'image',
    'simulated',
    method === 'comprehensive' ? 'detailed-sim' : 'basic-sim',
    ...fileName
      .split(/[_\-\s]/)
      .filter((word) => word.length > 2 && word.length < 15), // Basic filtering
  ];

  // For comprehensive analysis, add more detailed keywords
  if (method === 'comprehensive') {
    keywords.push('high-resolution-sim', 'complex-sim');
  } else if (method === 'fast') {
    keywords.push('quick-scan-sim');
  }

  // Simulate a short processing delay
  await new Promise((resolve) => setTimeout(resolve, 150)); // Reduced delay

  // Basic scene type guess based on filename
  let sceneType = 'unknown-sim';
  if (fileName.toLowerCase().includes('outdoor')) sceneType = 'outdoor-sim';
  else if (fileName.toLowerCase().includes('indoor')) sceneType = 'indoor-sim';
  else if (fileName.toLowerCase().includes('city')) sceneType = 'urban-sim';

  // Simulated objects and colors
  const objects = ['sim-object1', 'sim-object2', `sim-${method}`];
  const colors = ['#F0F0F0', '#A0A0A0', '#505050']; // Grayscale placeholders

  return {
    keywords: [...new Set(keywords.map((k) => k.toLowerCase()))], // Deduplicate and lowercase
    objects: objects,
    sceneType: sceneType,
    colors: colors,
  };
}

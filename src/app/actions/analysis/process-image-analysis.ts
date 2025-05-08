'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getMediaItemById } from '@/actions/media/get-media-item-by-id';
import { VISION_MODEL } from '@/lib/consts';
import {
  markProcessingError,
  markProcessingSuccess,
} from '@/lib/processing-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem } from '@/types/db-types';
import type { Method } from '@/types/unified-stats';

// Schema for individual objects detected in the image
const ObjectSchema = z.object({
  name: z.string().describe('The name of the object'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('The confidence score of the object detection'),
  attributes: z
    .record(z.any())
    .optional()
    .describe('Additional attributes of the object'),
});

// Schema for our image analysis result
const imageAnalysisSchema = z.object({
  summary: z.string().describe('A concise summary of the image'),
  description: z
    .string()
    .optional()
    .describe("A very detailed description of what's visible in the image"),
  objects: z
    .array(ObjectSchema)
    .describe('An array of objects detected in the image'),
  scene: z.string().describe('The scene of the image'),
  colors: z
    .array(z.string())
    .describe(
      'An array of the main colors detected in the image, in hex format',
    ),
  time_of_day: z
    .enum(['Morning', 'Afternoon', 'Evening', 'Night'])
    .optional()
    .describe('The time of day the image was taken'),
  setting: z
    .string()
    .optional()
    .describe(
      'The setting of the image, e.g., indoor, outdoor, urban, nature, etc.',
    ),
  text_content: z.string().describe('Any text detected in the image'),
  keywords: z
    .array(z.string())
    .optional()
    .describe('A comprehensive list of keywords relevant to the image'),
  sentiment: z.string().optional().describe('Sentiment analysis of the image'),
  qualityScore: z
    .number()
    .optional()
    .describe(
      'Perceived quality score of the image, between 0 and 1, of how good the image is',
    ),
  safetyIssues: z
    .array(z.string())
    .optional()
    .describe(
      'Safety issues detected in the image, such as NSFW or illegal content',
    ),
});

// Type for the image analysis result
type ImageAnalysisResult = z.infer<typeof imageAnalysisSchema>;

/**
 * Analyze image using Ollama vision model
 */
async function analyzeImageWithOllama(
  mediaItem: MediaItem,
  method: Method,
): Promise<ImageAnalysisResult> {
  try {
    // This should never happen, but for type safety, we check if the media item has a thumbnail path
    if (!mediaItem?.thumbnail_path) {
      throw new Error('Media item does not have a thumbnail path');
    }

    // Get start time for performance measurement
    const startTime = performance.now();

    // Convert image to base64
    const imageBuffer = await fs.readFile(mediaItem.thumbnail_path);
    const base64Image = imageBuffer.toString('base64');

    // Convert the Zod schema to JSON Schema format for Ollama
    const jsonSchema = zodToJsonSchema(imageAnalysisSchema);

    // Create the messages array for Ollama
    const messages = [
      {
        role: 'user',
        content:
          'Analyze this image and return a detailed JSON description including objects, scene, colors, time of day, setting, sentiment, quality score, ' +
          'Please include a summary, keywords, and any detected text content. ' +
          'The analysis should be as detailed as possible. ' +
          'safetyIssues should include any potential safety concerns, such as dangerous, adult, or NSFW content. ' +
          'The response should be in JSON format and follow the provided schema.',
        images: [base64Image],
      },
    ];

    // Call the Ollama API
    console.log(
      `[Analysis] Calling Ollama API with model ${VISION_MODEL} for ${path.basename(mediaItem.file_path)}`,
    );
    const response = await ollama.chat({
      model: VISION_MODEL,
      messages: messages,
      format: jsonSchema,
      options: {
        temperature: method === 'fast' ? 0.7 : 0, // Use more deterministic responses for detailed method
      },
    });

    // Parse and validate the response
    const analysisResult = imageAnalysisSchema.parse(
      JSON.parse(response.message.content),
    );
    console.log('response: ', response);

    // Calculate duration
    const duration = performance.now() - startTime;
    console.log(
      `[Analysis] Ollama analysis completed in ${duration.toFixed(2)}ms for ${path.basename(mediaItem.file_path)}`,
    );

    return analysisResult;
  } catch (error) {
    console.error('[Analysis] Ollama vision analysis error:', error);
    throw error;
  }
}

/**
 * Process a single image for analysis
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
  analysisResult?: ImageAnalysisResult;
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

    // Check if the media item has a thumbnail path
    // This is important for Ollama to analyze the image
    if (!mediaItem?.thumbnail_path) {
      const errorMessage = 'Media item does not have a thumbnail path';
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

    progressCallback?.('Starting image analysis with Ollama vision model...');

    // Use Ollama for image analysis
    const analysisResult = await analyzeImageWithOllama(mediaItem, method);

    if (!analysisResult) {
      const errorMessage = 'Failed to analyze image with Ollama';

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

    // Convert Ollama format to database format
    const objectNames = analysisResult.objects.map((obj) => obj.name);
    const fullText = JSON.stringify(analysisResult);
    const keywords =
      analysisResult.keywords ||
      analysisResult.summary
        .split(' ')
        .filter((word) => word.length > 3)
        .map((word) => word.toLowerCase())
        .slice(0, 10);

    // Store the results in the database
    const supabase = createServerSupabaseClient();

    // First, update the main image_analysis table
    const { error: upsertError } = await supabase
      .from('image_analysis')
      .upsert({
        media_item_id: mediaId,
        keywords: keywords,
        objects: objectNames,
        scene_types: [analysisResult.scene],
        colors: analysisResult.colors,
        full_analysis: fullText,
        processing_state: 'completed',
        processing_completed: new Date().toISOString(),
        sentiment: analysisResult.sentiment,
        quality_score: analysisResult.qualityScore,
        safety_issues: analysisResult.safetyIssues || [],
        // Map time_of_day and setting to appropriate fields if they exist in your database
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
      errorMessage: 'Image analysis completed successfully',
    });

    progressCallback?.('Analysis completed and stored in database');

    return {
      success: true,
      message: 'Image analysis completed successfully',
      analysisResult,
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

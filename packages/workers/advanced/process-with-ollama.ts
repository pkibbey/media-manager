'use server';

import { Ollama } from 'ollama'; // Changed import
import { createSupabase } from 'shared';
import type { TablesInsert } from 'shared/types';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const VISION_MODEL = 'gemma3:4b';

/*
    Ollama vision capabilities with structured outputs
    It takes an image file as input and returns a structured JSON description of the image contents
    including detected objects, scene analysis, colors, and any text found in the image
*/

const SimplifiedImageDescriptionSchema = z.object({
  image_description: z.string().describe('A concise description of the image'),
});

const simplifiedUserPrompt =
  'Analyze this image and provide a concise description of its content.';

// Schema for advanced analysis with more detailed information
const _AdvancedImageDescriptionSchema = z.object({
  image_description: z
    .string()
    .describe('A very detailed description of the image'),
  objects: z
    .array(
      z.object({
        name: z.string().describe('The name of the object'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe('The confidence score of the object detection'),
        attributes: z
          .record(z.any())
          .optional()
          .describe('Additional attributes of the object'),
      }),
    )
    .describe('An array of objects detected in the image'),
  scene_types: z.array(z.string().describe('The scene of the image')),
  time_of_day: z
    .enum(['Morning', 'Afternoon', 'Evening', 'Night'])
    .describe('The time of day the image was taken'),
  setting: z
    .enum(['Indoor', 'Outdoor', 'Unknown'])
    .describe('The setting of the image'),
  text_content: z.string().describe('Any text detected in the image'),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Keyword tags related to the image, useful for search'),
  colors: z
    .array(z.string())
    .optional()
    .describe('Dominant colors in the image'),
  people: z
    .array(
      z.object({
        description: z.string().describe('Description of the person'),
        attributes: z
          .record(z.any())
          .optional()
          .describe('Additional attributes of the person'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe('The confidence score of the person detection'),
        bounding_box: z
          .object({
            x: z.number().describe('X coordinate of the bounding box'),
            y: z.number().describe('Y coordinate of the bounding box'),
            width: z.number().describe('Width of the bounding box'),
            height: z.number().describe('Height of the bounding box'),
          })
          .optional()
          .describe('Bounding box coordinates of the person'),
      }),
    )
    .optional()
    .describe('People detected in the image'),
  emotions: z
    .array(z.string())
    .optional()
    .describe('Emotions expressed in the image'),
  artistic_elements: z
    .object({
      focus: z.string().describe('An artistic description of the focus'),
      lighting: z.string().describe('An artistic description of the lighting'),
      composition: z
        .string()
        .describe('An artistic description of the composition'),
      color_palette: z
        .string()
        .describe('An artistic description of the color palette'),
      style: z.string().describe('An artistic description of the style'),
      mood: z.string().describe('An artistic description of the mood'),
    })
    .optional()
    .describe('Artistic elements in the image'),
  quality_assessment: z
    .object({
      sharpness: z.number().min(0).max(10).describe('Image sharpness rating'),
      lighting: z.number().min(0).max(10).describe('Image lighting quality'),
      composition: z.number().min(0).max(10).describe('Composition quality'),
      color_balance: z
        .number()
        .min(0)
        .max(10)
        .describe('Color balance quality'),
      noise_level: z
        .number()
        .min(0)
        .max(10)
        .describe('Noise level in the image'),
      artifacts: z
        .number()
        .min(0)
        .max(10)
        .describe('Presence of compression artifacts'),
      overall_quality: z
        .number()
        .min(0)
        .max(10)
        .describe('Overall image quality rating'),
    })
    .optional()
    .describe('Assessment of image quality'),
  content_warnings: z
    .array(
      z.object({
        level: z.string().describe('Content warning level'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe('Confidence score of the content warning level'),
      }),
    )
    .optional()
    .describe(
      'Content warning for various difrent categories - violence, adult, etc.',
    ),
});

const _advancedUserPrompt = `
  Analyze this image and return:
    A very detailed description of the image,
    Objects detected in the image - name, bounding box attributes,
    The scenes detected in the image - portrait, landscape, etc.,
    The time of day the image was taken - morning, afternoon, evening, night,
    The setting of the image - indoor, outdoor, beach, etc. - include confidence score,
    Any text detected in the image,
    Keyword tags related to the image, useful for search,
    Dominant colors in the image,
    People detected in the image - description, bounding box attributes,
    Emotions expressed in the image - joy, sadness, anger, etc.,
    Artistic elements in the image - focus, lighting, composition, color palette, style, mood,
    Assessment of image quality - focus, lighting, composition, color balance, noise level, artifacts, overall quality,
    Content warning for various difrent categories - violence, adult, etc.
  Inlude confidence scores for all attributes where applicable.
`;

// Create an Ollama client instance - By default, it connects to the local Ollama server
const ollamaClient = new Ollama();

// Initialize Supabase client once
const supabase = createSupabase();

/**
 * Process advanced analysis with standard boolean return pattern
 */
export async function processAdvancedAnalysis({
  mediaId,
  thumbnailUrl,
}: {
  mediaId: string;
  thumbnailUrl: string;
}): Promise<boolean> {
  try {
    const result = await processWithOllama({ mediaId, thumbnailUrl });

    if (!result.success || !result.analysisData) {
      throw new Error(result.error || 'Failed to generate analysis data');
    }

    // Save analysis data
    const { error: upsertError } = await supabase
      .from('analysis_data')
      .upsert(result.analysisData, { onConflict: 'media_id' });

    if (upsertError) {
      throw new Error(
        `Failed to save analysis data for media ID ${mediaId}: ${upsertError.message}`,
      );
    }

    return true;
  } catch (error) {
    console.error(
      `Error in advanced analysis processing for media ${mediaId}:`,
      error,
    );
    return false;
  }
}

/**
 * Process a single media item with Ollama for advanced analysis (batch-optimized version)
 * This version returns analysis data without performing database operations immediately
 */
export async function processWithOllama({
  mediaId,
  thumbnailUrl,
}: {
  mediaId: string;
  thumbnailUrl: string;
}): Promise<{
  success: boolean;
  mediaId: string;
  processingTime: number;
  error?: string;
  analysisData?: TablesInsert<'analysis_data'>;
}> {
  const startTime = Date.now();

  try {
    // Fetch the image from the URL
    const imageResponse = await fetch(thumbnailUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    // Get the image data as a buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Convert the Zod schema to JSON Schema format
    const jsonSchema = zodToJsonSchema(SimplifiedImageDescriptionSchema);

    const messages = [
      {
        role: 'user',
        content: simplifiedUserPrompt,
        images: [base64Image],
      },
    ];

    // Time the Ollama API call
    const response = await ollamaClient.chat({
      model: VISION_MODEL,
      messages: messages,
      format: jsonSchema,
      options: {
        temperature: 0, // Make responses more deterministic
      },
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    if (!response.message.content) {
      throw new Error('No content received from Ollama');
    }

    try {
      // Try to parse the response content as JSON
      const parsedContent = JSON.parse(response.message.content);

      // Validate the parsed content against the schema
      const parsedResult =
        SimplifiedImageDescriptionSchema.parse(parsedContent);

      const analysisData: TablesInsert<'analysis_data'> = {
        ...parsedResult,
        media_id: mediaId,
      };

      return {
        success: true,
        mediaId,
        processingTime,
        analysisData,
      };
    } catch (e) {
      console.error('Failed to parse Ollama response:', e);
      return {
        success: false,
        mediaId,
        processingTime,
        error: `Failed to parse analysis response: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
    }
  } catch (error) {
    console.error('Error processing image with Ollama:', error);
    return {
      success: false,
      mediaId,
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

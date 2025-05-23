'use server';

import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { VISION_MODEL } from '@/lib/consts';
import { createSupabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/supabase';

/*
    Ollama vision capabilities with structured outputs
    It takes an image file as input and returns a structured JSON description of the image contents
    including detected objects, scene analysis, colors, and any text found in the image
*/

// Schema for advanced analysis with more detailed information
const AdvancedImageDescriptionSchema = z.object({
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

export default async function processWithOllama({
  mediaId,
}: {
  mediaId: string;
}): Promise<{
  success: boolean;
  error?: string;
  processingTime?: number;
}> {
  // Verify the file exists and read it
  try {
    // Get media URL from database
    const supabase = createSupabase();
    const { data: mediaData } = await supabase
      .from('media')
      .select('*, thumbnail_data(*)')
      .eq('id', mediaId)
      .single();

    const imageUrl = mediaData?.thumbnail_data?.thumbnail_url;
    if (!imageUrl) throw new Error('Image URL not found');

    const startTime = Date.now(); // Record start time

    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    // Get the image data as a buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Convert the Zod schema to JSON Schema format
    const jsonSchema = zodToJsonSchema(AdvancedImageDescriptionSchema);

    const messages = [
      {
        role: 'user',
        content: `
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
        `,
        images: [base64Image],
      },
    ];

    // Time the Ollama API call
    const response = await ollama.chat({
      model: VISION_MODEL,
      messages: messages,
      format: jsonSchema,
      options: {
        temperature: 0, // Make responses more deterministic
      },
    });

    const endTime = Date.now(); // Record end time
    const processingTime = endTime - startTime; // Calculate processing time

    if (!response.message.content) {
      throw new Error('No content received from Ollama');
    }

    try {
      // Try to parse the response content as JSON
      const parsedContent = JSON.parse(response.message.content);

      // Validate the parsed content against the schema
      const parsedResult = AdvancedImageDescriptionSchema.parse(parsedContent);

      const upsertObject: TablesInsert<'analysis_data'> = {
        ...parsedResult,
        media_id: mediaId,
      };

      // Use upsert instead of select+insert/update
      const { error: upsertError } = await supabase
        .from('analysis_data')
        .upsert(upsertObject, { onConflict: 'media_id' });

      if (upsertError) {
        throw new Error(
          `Failed to upsert analysis data: ${upsertError.message}`,
        );
      }
    } catch (e) {
      console.error('Failed to parse Ollama response:', e);
      throw new Error(
        `Failed to parse analysis response: ${e instanceof Error ? e.message : 'Unknown error'}`,
      );
    }

    // Update the media item to mark it as processed
    const { error: updateError } =
      await setMediaAsAdvancedAnalysisProcessed(mediaId);

    if (updateError) {
      throw new Error(`Failed to update media status: ${updateError.message}`);
    }

    return { success: true, processingTime };
  } catch (error) {
    console.error('Error reading image file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function setMediaAsAdvancedAnalysisProcessed(mediaId: string) {
  const supabase = createSupabase();

  return supabase
    .from('media')
    .update({ is_advanced_processed: true })
    .eq('id', mediaId);
}

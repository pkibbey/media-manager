'use server';

import ollama from 'ollama';
import { v4 } from 'uuid';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { VISION_MODEL } from '@/lib/consts';
import { createSupabase } from '@/lib/supabase';

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
  console.log('mediaId: ', mediaId);
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
        content:
          'Analyze this image and return a detailed JSON description including objects, scene, dominant colors, setting, people, keywords tags, emotions, the artistic content of the image, a quality assessment, and any text content detected. If you cannot determine certain details, leave those fields empty.',
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

    // Try to parse the response content as JSON
    let parsedContent: Record<string, any>;
    try {
      parsedContent = JSON.parse(response.message.content) as Record<
        string,
        any
      >;
      console.log('parsedContent: ', parsedContent);
    } catch (e) {
      console.error('Failed to parse Ollama response:', e);
      throw new Error(
        `Failed to parse analysis response: ${e instanceof Error ? e.message : 'Unknown error'}`,
      );
    }

    // Calculate quality score based on quality_assessment if available
    let quality_assessment = 5; // Default middle value
    if (parsedContent.quality_assessment) {
      const qa = parsedContent.quality_assessment as Record<string, number>;
      // Average all quality metrics if available
      quality_assessment =
        qa.overall_quality !== undefined
          ? qa.overall_quality
          : ((qa.sharpness || 5) +
              (qa.lighting || 5) +
              (qa.composition || 5) +
              (qa.color_balance || 5) +
              (qa.noise_level || 5) +
              (qa.artifacts || 5)) /
            6;
    }

    // Map emotions to sentiments with confidence scores
    const sentiments: Array<Record<string, any>> = parsedContent.emotions
      ? parsedContent.emotions.map((emotion: string) => ({
          name: emotion,
          confidence: 0.8, // Default confidence since the model doesn't provide it
        }))
      : [];

    // Map people to faces with necessary structure
    const faces: Array<Record<string, any>> = parsedContent.people
      ? parsedContent.people.map((person: Record<string, any>) => ({
          confidence: person.confidence || 0.8,
          bounding_box: person.bounding_box || null,
          attributes: person.attributes || {},
        }))
      : [];

    // Prepare safety levels (if any)
    const safety_levels: Array<Record<string, any>> = [];

    // Create the analysis data object for database insertion
    const analysis_data = {
      id: v4(),
      media_id: mediaId,
      image_description: parsedContent.image_description || null,
      objects: parsedContent.objects || [],
      scene_types: parsedContent.scene_types || [],
      time_of_day: parsedContent.time_of_day || null,
      setting: parsedContent.setting || null,
      colors: parsedContent.colors || [],
      tags: parsedContent.keywords || [],
      sentiments: sentiments,
      faces: faces,
      safety_levels: safety_levels,
      quality_assessment: quality_assessment,
      created_date: new Date().toISOString(),
    };

    // Save results to database
    const { error: insertError } = await supabase
      .from('analysis_data')
      .upsert(analysis_data, {
        onConflict: 'media_id', // Only specify the unique column to identify the record
      });

    if (insertError) {
      throw new Error(`Failed to insert EXIF data: ${insertError.message}`);
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

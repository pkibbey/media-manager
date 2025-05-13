'use server';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { VISION_MODEL } from '@/lib/consts';

/*
    Ollama vision capabilities with structured outputs
    It takes an image file as input and returns a structured JSON description of the image contents
    including detected objects, scene analysis, colors, and any text found in the image
*/

// Schema for individual objects detected in the image
const ObjectSchema = z.object({
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
});

// Schema for individual objects detected in the image
const ImageDescriptionSchema = z.object({
  summary: z.string().describe('A concise summary of the image'),
  objects: z
    .array(ObjectSchema)
    .describe('An array of objects detected in the image'),
  scene: z.string().describe('The scene of the image'),
  colors: z
    .array(z.string())
    .describe('An array of colors detected in the image'),
  time_of_day: z
    .enum(['Morning', 'Afternoon', 'Evening', 'Night'])
    .describe('The time of day the image was taken'),
  setting: z
    .enum(['Indoor', 'Outdoor', 'Unknown'])
    .describe('The setting of the image'),
  text_content: z.string().describe('Any text detected in the image'),
});

export default async function processWithOllama() {
  // Start timing the entire process
  const totalStartTime = performance.now();

  // Verify the file exists and read it
  try {
    const fileReadStartTime = performance.now();
    const imagePath = resolve('/Users/phineas/Desktop/test.jpg');
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const fileReadDuration = performance.now() - fileReadStartTime;
    console.log(
      `File read and encoding took: ${fileReadDuration.toFixed(2)}ms`,
    );

    // Convert the Zod schema to JSON Schema format
    const schemaConversionStartTime = performance.now();
    const jsonSchema = zodToJsonSchema(ImageDescriptionSchema);
    const schemaConversionDuration =
      performance.now() - schemaConversionStartTime;
    console.log(
      `Schema conversion took: ${schemaConversionDuration.toFixed(2)}ms`,
    );

    const messages = [
      {
        role: 'user',
        content:
          'Analyze this image and return a detailed JSON description including objects, scene, colors and any text detected. If you cannot determine certain details, leave those fields empty.',
        images: [base64Image],
      },
    ];

    // Time the Ollama API call
    const ollamaCallStartTime = performance.now();
    const response = await ollama.chat({
      model: VISION_MODEL,
      messages: messages,
      format: jsonSchema,
      options: {
        temperature: 0, // Make responses more deterministic
      },
    });
    const ollamaCallDuration = performance.now() - ollamaCallStartTime;
    console.log(
      `Ollama API call with the ${VISION_MODEL} model took: ${ollamaCallDuration.toFixed(2)}ms`,
    );

    // Parse and validate the response
    try {
      const parseStartTime = performance.now();
      const imageAnalysis = ImageDescriptionSchema.parse(
        JSON.parse(response.message.content),
      );
      const parseDuration = performance.now() - parseStartTime;
      console.log(`Response parsing took: ${parseDuration.toFixed(2)}ms`);
      console.log('Image Analysis:', imageAnalysis);
      console.log(imageAnalysis.objects.map((item) => item.attributes));
    } catch (error) {
      console.error('Generated invalid response:', error);
    }

    // Log the total duration
    const totalDuration = performance.now() - totalStartTime;
    console.log(
      `Total process with the ${VISION_MODEL} model took: ${totalDuration.toFixed(2)}ms`,
    );
  } catch (error) {
    console.error('Error reading image file:', error);
  }
}

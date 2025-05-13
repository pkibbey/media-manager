import { pipeline } from '@xenova/transformers';
import * as canvas from 'canvas'; // Ensure canvas is imported if not already
import * as faceapi from 'face-api.js';
import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type {
  ObjectsType,
  SafetyLevelType,
  SentimentType,
} from '@/types/analysis';

// Cache these to avoid reloading
let objectDetectorPromise: any = null;
let sentimentAnalyzerPromise: any = null;
let safetyLevelDetectorPromise: any = null;

export async function getObjectDetector(): Promise<
  (imageUrl: string, { topk }: { topk?: number }) => ObjectsType[]
> {
  if (!objectDetectorPromise) {
    objectDetectorPromise = pipeline(
      'object-detection',
      'Xenova/detr-resnet-50',
      { quantized: false },
    );
  }
  return objectDetectorPromise;
}

// Schema for a simple caption
const CaptionSchema = z.object({
  caption: z.string().describe('A concise caption for the image.'),
});

const CaptionJsonSchema = zodToJsonSchema(CaptionSchema);

export async function getCaptioner(): Promise<
  (imageUrl: string) => Promise<{ generated_text: string }[]>
> {
  // No specific model loading needed here if ollama handles it
  return async (imageUrl: string) => {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the image data as a buffer
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const messages = [
      {
        role: 'user',
        content: 'Generate a concise caption for this image.',
        images: [base64Image],
      },
    ];

    try {
      const response = await ollama.chat({
        model: 'gemma3', // Using gemma3 vision enabled model
        messages: messages,
        format: CaptionJsonSchema, // Expecting JSON output based on a schema
      });

      // Assuming the response.message.content is a JSON string like `{"caption": "..."}`
      // Or if moondream directly returns the caption string in response.message.content
      let captionText = 'Could not generate caption.';
      if (response.message.content) {
        // Try to parse if it's JSON, otherwise use as is.
        try {
          const parsedContent = JSON.parse(response.message.content);
          if (parsedContent && typeof parsedContent.caption === 'string') {
            captionText = parsedContent.caption;
          } else {
            // If not the expected JSON, maybe the content itself is the caption
            captionText = response.message.content;
          }
        } catch (_e) {
          // If parsing fails, assume the content string is the caption
          captionText = response.message.content;
        }
      }
      return [{ generated_text: captionText }];
    } catch (error) {
      console.error('Error generating caption with ollama:', error);
      return [{ generated_text: 'Error generating caption.' }];
    }
  };
}

export async function getQualityAssessment(): Promise<
  (text: string) => SentimentType[]
> {
  if (!sentimentAnalyzerPromise) {
    sentimentAnalyzerPromise = pipeline(
      'image-classification',
      'shivarama23/DiT_image_quality',
      { quantized: false },
    );
  }
  return sentimentAnalyzerPromise;
}

export async function getSafetyLevelDetector(): Promise<
  (imageUrl: string) => SafetyLevelType[]
> {
  if (!safetyLevelDetectorPromise) {
    safetyLevelDetectorPromise = pipeline(
      'image-classification',
      'AdamCodd/vit-base-nsfw-detector',
    );
  }
  return safetyLevelDetectorPromise;
}

export async function getFaceRecognition() {
  /**
   * Returns an asynchronous function that detects faces, landmarks, and computes descriptors.
   * Models (ssdMobilenetv1, faceLandmark68Net, faceRecognitionNet) are assumed
   * to be loaded globally.
   */
  return async (imageUrl: string) => {
    // canvas.loadImage is used to load the image from the URL.
    // The 'Image' object from 'canvas' is monkey-patched to be compatible with face-api.js.
    const image = await canvas.loadImage(imageUrl);

    // Perform face detection, landmark detection, and compute face descriptors.
    console.log('detectAllFaces: ', imageUrl);
    const detections = await faceapi.detectAllFaces(
      image as unknown as faceapi.TNetInput,
    ); // Cast needed due to monkey-patching;

    return detections;
  };
}

import { z } from 'zod';

const BoundingBoxSchema = z.object({
  xmin: z.number().describe('The minimum x-coordinate of the bounding box'),
  ymin: z.number().describe('The minimum y-coordinate of the bounding box'),
  xmax: z.number().describe('The maximum x-coordinate of the bounding box'),
  ymax: z.number().describe('The maximum y-coordinate of the bounding box'),
});

const ObjectsSchema = z.object({
  label: z.string().describe('The name of the object'),
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence score of the object detection'),
  box: BoundingBoxSchema.describe(
    'The bounding box coordinates of the detected object',
  ),
});

export type ObjectsType = z.infer<typeof ObjectsSchema>;

const SentimentSchema = z.object({
  label: z.string().describe('The sentiment label'),
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence score of the sentiment'),
});

export type SentimentType = z.infer<typeof SentimentSchema>;

const SafetyLevelSchema = z.object({
  label: z.string().describe('The safety level label'),
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence score of the safety level'),
});

export type SafetyLevelType = z.infer<typeof SafetyLevelSchema>;

export const ImageDescriptionSchema = z.object({
  image_description: z.string().describe('The full description of the image'),
  scene_types: z
    .array(z.string())
    .describe('An array of scene types detected in the image'),
  tags: z
    .array(z.string())
    .describe('An array of tags associated with the image'),
  sentiment: z
    .array(SentimentSchema)
    .describe('The sentiment score of the image'),
  quality_score: z
    .number()
    .min(0)
    .max(1)
    .describe('The quality score of the image'),
  safety_levels: z
    .array(SafetyLevelSchema)
    .describe(
      'The safety level of the image, indicating if it is safe for work',
    ),
  objects: z
    .array(ObjectsSchema)
    .describe('An array of objects detected in the image'),
  scene: z.string().describe('The scene of the image').optional(),
  faces: z
    .array(z.record(z.any()))
    .describe('An array of faces detected in the image')
    .optional(),
  colors: z
    .array(z.string())
    .describe('An array of colors detected in the image')
    .optional(),
});

export type ImageDescriptionType = z.infer<typeof ImageDescriptionSchema>;

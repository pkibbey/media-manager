import { z } from 'zod';

// New schema matching the COCO-SSD format
const DetectedObjectSchema = z.object({
  class: z.string().describe('The name of the object'),
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence score of the object detection'),
  bbox: z
    .tuple([
      z.number().describe('y coordinate'),
      z.number().describe('x coordinate'),
      z.number().describe('height'),
      z.number().describe('width'),
    ])
    .describe(
      'The bounding box coordinates of the detected object [y, x, height, width]',
    ),
});

export type DetectedObjectType = z.infer<typeof DetectedObjectSchema>;

const SafetyLevelSchema = z.object({
  label: z.string().describe('The safety level label'),
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence score of the safety level'),
});

export type SafetyLevelType = z.infer<typeof SafetyLevelSchema>;

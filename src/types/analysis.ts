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

export type ThresholdType = Record<number, number>;

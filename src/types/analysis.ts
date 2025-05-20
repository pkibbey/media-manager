import { z } from 'zod';

const BoundingBoxSchema = z.object({
  bottom: z.number().describe('The bottom coordinate of the bounding box'),
  left: z.number().describe('The left coordinate of the bounding box'),
  right: z.number().describe('The right coordinate of the bounding box'),
  top: z.number().describe('The top coordinate of the bounding box'),
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

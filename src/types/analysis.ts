import { z } from 'zod';

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

export type ObjectType = z.infer<typeof ObjectSchema>;

// Schema for individual objects detected in the image
export const ImageDescriptionSchema = z.object({
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

export type ImageDescriptionType = z.infer<typeof ImageDescriptionSchema>;

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
  image_description: z.string().describe('The full description of the image'),
  scene_types: z
    .array(z.string())
    .describe('An array of scene types detected in the image'),
  tags: z
    .array(z.string())
    .describe('An array of tags associated with the image'),
  sentiment: z
    .number()
    .min(0)
    .max(1)
    .describe('The sentiment score of the image'),
  quality_score: z
    .number()
    .min(0)
    .max(1)
    .describe('The quality score of the image'),
  safety_level: z.number().describe('The safety level of the image'),
  objects: z
    .array(ObjectSchema)
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
  time_of_day: z
    .enum(['Morning', 'Afternoon', 'Evening', 'Night'])
    .describe('The time of day the image was taken')
    .optional(),
  setting: z
    .enum(['Indoor', 'Outdoor', 'Unknown'])
    .describe('The setting of the image')
    .optional(),
});

export type ImageDescriptionType = z.infer<typeof ImageDescriptionSchema>;

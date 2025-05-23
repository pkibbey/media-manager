import { z } from 'zod';

const SafetyLevelSchema = z.object({
  label: z.string().describe('The safety level label'),
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence score of the safety level'),
});

export type SafetyLevelType = z.infer<typeof SafetyLevelSchema>;

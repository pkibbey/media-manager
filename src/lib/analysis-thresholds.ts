import type { ThresholdType } from '@/types/analysis';

/**
 * Standard thresholds for basic object detection analysis
 */
export const ANALYSIS_THRESHOLDS: ThresholdType = {
  1: 30, // Pass to the next tier at 30 points
  2: 60, // Pass to the next tier at 60 points
  3: 90, // Pass to the next tier at 90 points
};

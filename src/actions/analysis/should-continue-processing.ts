import type { ThresholdType } from '@/types/analysis';
import { calculateInterestScore } from './calculate-intrest-score';

export async function shouldContinueProcessing(
  results: any,
  currentTier: number,
  thresholds: ThresholdType,
): Promise<boolean> {
  const interestScore = await calculateInterestScore(results);
  const thresholdForTier = thresholds[currentTier];

  if (thresholdForTier === undefined) {
    return false;
  }
  return interestScore >= thresholdForTier;
}

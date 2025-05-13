import { ANALYSIS_THRESHOLDS } from '@/lib/analysis-thresholds';
import { calculateInterestScore } from './calculate-intrest-score';

export async function shouldContinueProcessing(
  results: any,
  currentTier: number,
): Promise<boolean> {
  const interestScore = await calculateInterestScore(results);
  const thresholdForTier = ANALYSIS_THRESHOLDS[currentTier];

  if (thresholdForTier === undefined) {
    return false;
  }
  return interestScore >= thresholdForTier;
}

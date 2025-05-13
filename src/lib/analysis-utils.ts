import type {
  ObjectsType,
  SafetyLevelType,
  SentimentType,
} from '@/types/analysis';
import type { Json } from '@/types/supabase';

// Format dates consistently
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const extractSentiments = (
  sentimentArray?: Json[],
): SentimentType | null => {
  if (!sentimentArray) return null;

  const typedSentiment = sentimentArray as SentimentType[];
  if (typedSentiment.length === 0) return null;

  // Find the sentiment with highest score
  return typedSentiment.reduce(
    (highest, current) => (current.score > highest.score ? current : highest),
    typedSentiment[0],
  );
};

export const extractObjects = (objectsArray?: Json[]): ObjectsType[] => {
  if (!objectsArray) return [];

  const typedObjects = objectsArray as ObjectsType[];
  if (typedObjects.length === 0) return [];

  return typedObjects;
};

export const extractSafetyLevels = (
  safetyLevels?: Json[],
): SafetyLevelType[] | null => {
  if (!safetyLevels) return null;

  const typedSafetyLevels = safetyLevels as SafetyLevelType[];
  if (typedSafetyLevels.length === 0) return null;

  return typedSafetyLevels;
};

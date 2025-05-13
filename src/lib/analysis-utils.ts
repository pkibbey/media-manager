import type {
  ObjectsType,
  SafetyLevelType,
  SentimentType,
} from '@/types/analysis';

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
  sentimentArray?: SentimentType[],
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

export const extractObjects = (
  objectsArray?: ObjectsType[],
): ObjectsType[] | null => {
  if (!objectsArray) return null;

  const typedObjects = objectsArray;
  if (typedObjects.length === 0) return null;

  return typedObjects;
};

export const extractSafetyLevels = (
  safetyLevels?: SafetyLevelType[],
): SafetyLevelType[] | null => {
  if (!safetyLevels) return null;

  const typedSafetyLevels = safetyLevels;
  if (typedSafetyLevels.length === 0) return null;

  return typedSafetyLevels;
};

import { pipeline } from '@xenova/transformers';
import type {
  ObjectsType,
  SafetyLevelType,
  SentimentType,
} from '@/types/analysis';

// Cache these to avoid reloading
let objectDetectorPromise: any = null;
let captionerPromise: any = null;
let sentimentAnalyzerPromise: any = null;
let safetyLevelDetectorPromise: any = null;

export async function getObjectDetector(): Promise<
  (imageUrl: string, { topk }: { topk?: number }) => ObjectsType[]
> {
  if (!objectDetectorPromise) {
    objectDetectorPromise = pipeline(
      'object-detection',
      'Xenova/detr-resnet-50',
      { quantized: false },
    );
  }
  return objectDetectorPromise;
}

export async function getCaptioner(): Promise<
  (imageUrl: string) => { generated_text: string }[]
> {
  if (!captionerPromise) {
    captionerPromise = pipeline(
      'image-to-text',
      'Xenova/vit-gpt2-image-captioning',
      { quantized: false },
    );
  }
  return captionerPromise;
}

export async function getSentimentAnalyzer(): Promise<
  (text: string) => SentimentType[]
> {
  if (!sentimentAnalyzerPromise) {
    sentimentAnalyzerPromise = pipeline(
      'text-classification',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    );
  }
  return sentimentAnalyzerPromise;
}

export async function getSafetyLevelDetector(): Promise<
  (imageUrl: string) => SafetyLevelType[]
> {
  if (!safetyLevelDetectorPromise) {
    safetyLevelDetectorPromise = pipeline(
      'image-classification',
      'AdamCodd/vit-base-nsfw-detector',
    );
  }
  return safetyLevelDetectorPromise;
}

'use server';

import * as canvas from 'canvas';
import * as faceapi from 'face-api.js';
import {
  getCaptioner,
  getFaceRecognition,
  getObjectDetector,
  loadDetailedCaptioner,
} from '@/lib/analysis-models';
import { createSupabase } from '@/lib/supabase';
import type { ThresholdType } from '@/types/analysis';
import { getCurrentTier } from './get-current-tier';
import { shouldContinueProcessing } from './should-continue-processing';
import { storeAnalysisResults } from './store-analysis-results';

// patch nodejs environment, we need to provide an implementation of
// HTMLCanvasElement and HTMLImageElement
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({
  Canvas: Canvas as any,
  Image: Image as any,
  ImageData: ImageData as any,
});

export async function processWithTiers({
  mediaId,
  thresholds,
}: {
  mediaId: string;
  thresholds: ThresholdType;
}) {
  const maxTier = 3; // Define the maximum tier for processing
  const currentTier = await getCurrentTier(mediaId);
  let processingTier = currentTier + 1;
  let shouldContinue = true;
  let processingTime = 0;

  while (shouldContinue && processingTier <= maxTier) {
    const results = await runAnalysisForTier(mediaId, processingTier);
    processingTime += results.processingTime || 0;

    await storeAnalysisResults(mediaId, processingTier, results);
    shouldContinue = await shouldContinueProcessing(
      results,
      processingTier,
      thresholds,
    );
    if (shouldContinue) {
      processingTier++;
    }
  }

  return {
    success: true,
    highestTierProcessed: processingTier - 1,
    processingTime,
  };
}

async function runAnalysisForTier(mediaId: string, tier: number) {
  console.log('Checking tier ', tier);

  // Get media URL from database
  const supabase = createSupabase();
  const { data: mediaData } = await supabase
    .from('media')
    .select('*, thumbnail_data(*)')
    .eq('id', mediaId)
    .single();

  const imageUrl = mediaData?.thumbnail_data?.thumbnail_url;

  if (!imageUrl) throw new Error('Image URL not found');

  console.log('Found imageUrl: ', imageUrl);

  const startTime = Date.now(); // Record start time
  switch (tier) {
    case 1: {
      console.log('Running advanced analysis');
      // Basic analysis
      const objectDetector = await getObjectDetector();

      const objects = await objectDetector(imageUrl, { topk: 5 });

      const endTime = Date.now(); // Record end time
      const processingTime = endTime - startTime; // Calculate processing time

      return { objects, processingTime };
    }

    case 2: {
      console.log('Running intermediate analysis');
      // Intermediate analysis
      const captioner = await getCaptioner();
      const caption = await captioner(imageUrl);

      const endTime = Date.now(); // Record end time
      const processingTime = endTime - startTime; // Calculate processing time

      return { caption, processingTime };
    }

    case 3: {
      console.log('Running advanced analysis');
      // Advanced analysis
      const faceRecognition = await getFaceRecognition();
      const detailedCaptioner = await loadDetailedCaptioner();

      const faces = await faceRecognition(imageUrl);
      const detailedCaption = await detailedCaptioner(imageUrl);

      const endTime = Date.now(); // Record end time
      const processingTime = endTime - startTime; // Calculate processing time

      return { faces, detailedCaption, processingTime };
    }
    default:
      throw new Error(`Invalid tier: ${tier}`);
  }
}

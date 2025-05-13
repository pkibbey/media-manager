# Tiered Media Processing System - Simplified

This document outlines a simple implementation of tiered processing for media analysis in the Media Manager application.

## Core Concept

The system processes media in progressively more intensive tiers:

1. Each media item passes through initial cheap/fast filters
2. Only items deemed interesting proceed to more expensive processing
3. Each tier takes approximately 10x more processing time than the previous

| Tier | Analysis Type | Processing Time | Primary Functions |
|------|---------------|-----------------|-------------------|
| 1    | Basic         | ~4ms-100ms      | Duplicate detection, object detection, quality check |
| 2    | Intermediate  | ~1s-4s          | Basic caption, scene classification, simple metadata |
| 3    | Advanced      | ~10s-30s        | Detailed caption, face recognition, relationship analysis |

## Implementation

### 1. Determining Current Processing Tier

Infer the current tier from existing analysis data (no schema changes required):

```typescript
async function getCurrentTier(mediaId: string): Promise<number> {
  const supabase = createSupabase();
  const { data } = await supabase
    .from('analysis_data')
    .select('type')
    .eq('media_id', mediaId);

  if (!data || data.length === 0) return 0;

  const tierMapping = {
    'object_detection_basic': 1,
    'duplicate_check': 1,
    'quality_assessment': 1,
    'basic_caption': 2,
    'scene_classification': 2,
    'safety_detection': 2,
    'detailed_caption': 3,
    'face_recognition': 3,
    'relationship_analysis': 3
  };

  return data.reduce((highest, analysis) => {
    return Math.max(highest, tierMapping[analysis.type] || 0);
  }, 0);
}
```

### 2. Simple Interest Scoring

Calculate interest score based on detected objects:

```typescript
function calculateInterestScore(results: any): number {
  let score = 0;

  if (results.objects) {
    score += Math.min(results.objects.length * 10, 30);
  }

  const interestingObjects = [
    { term: 'person', points: 25 },
    { term: 'face', points: 20 },
    { term: 'dog', points: 15 },
    { term: 'cat', points: 15 },
    { term: 'food', points: 10 },
    { term: 'beach', points: 10 },
    { term: 'mountain', points: 10 },
    { term: 'sunset', points: 10 }
  ];

  for (const obj of results.objects || []) {
    for (const interesting of interestingObjects) {
      if (obj.label.toLowerCase().includes(interesting.term) && obj.score > 0.6) {
        score += interesting.points;
        break;
      }
    }
  }

  return Math.min(score, 100);
}
```

### 3. Decision Logic

Simple YeahNope decision based on score thresholds:

```typescript
function shouldContinueProcessing(results: any, currentTier: number, thresholds: Record<number, number>): boolean {
  const interestScore = calculateInterestScore(results);
  const thresholdForTier = thresholds[currentTier];

  if (thresholdForTier === undefined) {
    return false;
  }
  return interestScore >= thresholdForTier;
}
```

### 4. Main Processing Function

Process a media item through appropriate tiers:

```typescript
export async function processWithTiers(mediaId: string, thresholds: Record<number, number>, maxTier = 3) {
  const currentTier = await getCurrentTier(mediaId);
  let processingTier = currentTier + 1;
  let shouldContinue = true;

  while (shouldContinue && processingTier <= maxTier) {
    const results = await runAnalysisForTier(mediaId, processingTier);
    await storeAnalysisResults(mediaId, processingTier, results);
    shouldContinue = shouldContinueProcessing(results, processingTier, thresholds);
    if (shouldContinue) {
      processingTier++;
    }
  }

  return { success: true, highestTierProcessed: processingTier - 1 };
}
```

### 5. Tier-specific Analysis

Run appropriate analysis based on tier:

```typescript
async function runAnalysisForTier(mediaId: string, tier: number) {
  // Get media URL from database
  const supabase = createSupabase();
  const { data: mediaData } = await supabase
    .from('media')
    .select('thumbnail_url')
    .eq('id', mediaId)
    .single();

  const imageUrl = mediaData?.thumbnail_url;
  if (!imageUrl) throw new Error('Image URL not found');

  switch (tier) {
    case 1:
      // Basic analysis
      const objectDetector = await getObjectDetector();
      const qualityAssessment = await getQualityAssessment();
      
      const objects = await objectDetector(imageUrl, { topk: 5 });
      const quality = await qualityAssessment(imageUrl);
      
      return { objects, quality };
      
    case 2:
      // Intermediate analysis
      const captioner = await getCaptioner();
      const sceneClassifier = await getSceneClassifier();
      
      const caption = await captioner(imageUrl);
      const scenes = await sceneClassifier(imageUrl);
      
      return { caption, scenes };
      
    case 3:
      // Advanced analysis
      const faceRecognition = await getFaceRecognition();
      const detailedCaptioner = await getDetailedCaptioner();
      
      const faces = await faceRecognition(imageUrl);
      const detailedCaption = await detailedCaptioner(imageUrl);
      
      return { faces, detailedCaption };
      
    default:
      throw new Error(`Invalid tier: ${tier}`);
  }
}
```

### 6. Using the System

Simple usage example:

```typescript
// Define thresholds for each tier
const thresholds = { 1: 30, 2: 50, 3: 80 };

// Process a single item
await processWithTiers('media-123', thresholds);

// Process a batch of items
async function processBatch(mediaIds: string[], thresholds: Record<number, number>) {
  const results = [];
  
  for (const id of mediaIds) {
    const result = await processWithTiers(id, thresholds);
    results.push(result);
  }
  
  return results;
}
```

## Integration with Existing Code

To integrate with the current batch processing system:

```typescript
// In process-batch-analysis.ts
export async function processBatchAnalysis(limit: number, thresholds: Record<number, number>) {
  // Find media items that need processing
  const supabase = createSupabase();
  const { data: mediaItems } = await supabase
    .from('media')
    .select('id')
    .eq('is_thumbnail_processed', true)
    .is('is_basic_processed', false)
    .limit(limit);

  if (!mediaItems || mediaItems.length === 0) {
    return { success: true, processed: 0, message: 'No items to process' };
  }

  // Process each item with tiered approach
  let succeeded = 0;
  let failed = 0;

  for (const item of mediaItems) {
    try {
      const result = await processWithTiers(item.id, thresholds);
      if (result.success) succeeded++;
    } catch (error) {
      failed++;
      console.error(`Error processing item ${item.id}:`, error);
    }
  }

  return {
    success: true,
    processed: succeeded,
    failed,
    total: mediaItems.length
  };
}
```

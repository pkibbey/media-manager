# Tiered Media Processing System

This document outlines the implementation of a tiered processing approach for the Media Manager application, inspired by the "YeahNope" decision framework discussed between Josh and Phineas.

## Core Concepts

### The Waterfall/Nightclub Line Approach

The system uses a progressively more intensive processing chain where:

1. Each media item passes through initial cheap/fast filters
2. Only worthy items proceed to more expensive processing tiers
3. Each tier takes approximately 10x more processing time than the previous
4. Items can be reprocessed in the future as criteria change

### YeahNope Decision Points

At each processing tier, the system makes a binary "YeahNope" decision:

- **Yeah**: Continue to deeper analysis
- **Nope**: Stop processing for now, queue for potential future processing

### Processing Tiers

![Tiered Processing Flowchart](https://mermaid.ink/img/pako:eNqNk81OwzAQhF_F8rlBJLQNIS2nREIvuXNELk19pLbsDbKbKgjx7tisWweaH3rZZL6Z0Xq1O6GVZUES6St9hwusjSnlYcWELQ95Xp11Bb1MUm_Uogdljf01xW-lXKcwpL6BzVWsO9DQ0Bdoe-dQGUX5G6gb8Bbmm_HCtpBLUx11rsPO6idcbN3cIJ3nhs8VvfG8KLhpydn6069RSQufDTQoCl16F_Xw8oI20-gDV4f72NuCxxBXRfiFoy7uFjJ8zS_VFNZxZ988bmTknjZXO_lFYHnxoNZv7mn0LRvX3PPUfADkHuPWtIMSUO_Vl9rxenROvp30Yc4lwr3RrXPfSWNEIrLPgISt0COMY_v6sAzz2UQDR_-2gcZuAXIrsESpQm55-tQ4bDNx9EchD69jlTy78GHmEqEwdoViDyOWB19g4Fjvntw_5xkGJOiRuyOrnAOVtG5oD2fSxWf7PxrUgki48OcoycUg04SQ3n-xQQyl5kkGkGGAKUpC4z8U29Tg?type=png)

| Tier | Analysis Type | Processing Time | Primary Functions |
|------|---------------|-----------------|-------------------|
| 1    | Basic         | ~4ms-100ms      | Duplicate detection, object detection, quality check |
| 2    | Intermediate  | ~1s-4s          | Basic caption, scene classification, simple metadata |
| 3    | Advanced      | ~10s-30s        | Detailed caption, face recognition, relationship analysis |

## Processing All Images Eventually

To ensure that every image is eventually processed through all tiers, the system should be run repeatedly with progressively lower thresholds. This allows the most interesting images to be processed first, while guaranteeing that all images are eventually processed as thresholds are relaxed.

### Example Orchestrator Loop

Below is a conceptual example of how an orchestrator might repeatedly run the processing with lower thresholds until all images are processed:

```typescript
// Example orchestrator pseudocode
const initialThresholds = { 1: 30, 2: 50, 3: 80 };
const minThresholds = { 1: 0, 2: 0, 3: 0 };
const decrement = { 1: 10, 2: 10, 3: 10 };

let thresholds = { ...initialThresholds };

while (await hasUnprocessedImages()) {
  // Process all images with current thresholds
  await processAllImagesWithThresholds(thresholds);

  // Lower thresholds for next pass
  for (const tier in thresholds) {
    thresholds[tier] = Math.max(minThresholds[tier], thresholds[tier] - decrement[tier]);
  }
}
```

- `hasUnprocessedImages()` should check if any images remain unprocessed at any tier. This could involve querying the database to identify images that have not yet reached the maximum processing tier or have a processing status indicating they need further analysis.
- `processAllImagesWithThresholds(thresholds)` should process all eligible images using the current thresholds. This function would likely iterate through the media library, applying the `processWithTiers` function to each image.

### Notes

- Images not processed in one run (due to high thresholds) are eligible for future runs as thresholds are lowered.
- The system can be configured to never process certain images by setting a nonzero minimum threshold, or to guarantee all images are processed by eventually lowering thresholds to zero.
- **Error Handling**: Implement robust error handling within the processing loop to catch and log any exceptions that occur during image processing. This will prevent a single failed image from halting the entire process.
- **Logging**: Add detailed logging to track the progress of image processing, including the thresholds used, the number of images processed, and any errors encountered. This will help in monitoring the system and diagnosing issues.

## Simplifications to Tiered Processing System

### Inferring Tiers from Existing Data

Instead of adding new columns to the database schema, the processing tier can be inferred from the existing `analysis_data` table. This eliminates the need for `processing_tier` and `next_processing_attempt` columns. The logic can map analysis types to tiers and determine the highest completed tier for a media item.

#### Example Logic:
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

### Simplified YeahNope Decision Logic

The "YeahNope" decision logic can be simplified using a scoring system. This approach assigns scores to detected objects and determines whether to proceed based on thresholds for each tier.

#### Example Logic:
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

// Modified to accept dynamicThresholds
function shouldContinueProcessing(results: any, currentTier: number, dynamicThresholds: Record<number, number>): boolean {
  const interestScore = calculateInterestScore(results);
  const thresholdForTier = dynamicThresholds[currentTier];

  if (thresholdForTier === undefined) {
    return false;
  }
  return interestScore >= thresholdForTier;
}
```

### Revised Processing Implementation

The processing logic can be streamlined to use the inferred tier and simplified decision logic:

#### Example Logic:
```typescript
// Modified to accept and use dynamicThresholds
export async function processWithTiers(mediaId: string, dynamicThresholds: Record<number, number>, maxTier = 3) {
  const currentTier = await getCurrentTier(mediaId);
  let processingTier = currentTier + 1;
  let shouldContinue = true;

  while (shouldContinue && processingTier <= maxTier) {
    const results = await runAnalysisForTier(mediaId, processingTier);
    await storeAnalysisResults(mediaId, processingTier, results);
    shouldContinue = shouldContinueProcessing(results, processingTier, dynamicThresholds);
    if (shouldContinue) {
      processingTier++;
    }
  }

  return { success: true, highestTierProcessed: processingTier - 1 };
}
```

### Benefits of Simplifications

1. **No Schema Changes:** Avoids adding new columns to the database.
2. **Dynamic Tier Inference:** Leverages existing data to determine processing state.
3. **Streamlined Logic:** Simplifies decision-making with a scoring system.
4. **Incremental Implementation:** Allows gradual addition of tiers and analyses.

## Future Enhancements

1. **Dynamic Thresholds**: Adjust the "YeahNope" criteria based on system load and queue size
2. **User Feedback Loop**: Learn from user interactions to improve processing decisions
3. **Adaptive Scheduling**: Schedule deeper analysis for off-peak hours
4. **Improved Prioritization**: Develop a more sophisticated scoring algorithm for processing priority
5. **Specialized Processing Clusters**: Implement Josh's idea of specialized processing clusters for faces, settings, etc.

#### Additional Concurrency Considerations
Running multiple parallel tasks can improve throughput but may also require load balancing. Implement a job scheduling system or use a queue-based approach to submit media items for processing in batches, ensuring that the system remains responsive under increased workload.

## Key Decision Points

When implementing this system, consider:

1. **Initial Filter Speed**: How cheap can you make the first pass while maintaining useful decision accuracy?
2. **YeahNope Criteria**: What specific criteria determine if an image deserves deeper analysis?
3. **Number of Tiers**: Is three tiers sufficient, or do you need more granularity?
4. **Reassessment Triggers**: When should you reconsider items that were previously deferred?
5. **Priority Scoring**: How do you calculate which items should be processed first?

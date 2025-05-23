'use server';

import sharp from 'sharp';
import type { MediaWithRelations } from '@/types/media-types';
import { saveDetectedObjects } from './save-detected-objects';
import { setMediaAsBasicAnalysisProcessed } from './set-media-as-analysis-processed';

type TensorflowPredictions = {
  num_detections: number;
  raw_detection_boxes: number[];
  detection_boxes: number[][];
  raw_detection_scores: number[];
  detection_scores: number[];
  detection_classes: number[];
  detection_anchor_indices: number[];
  detection_multiclass_scores: number[][];
};

const CONFIDENCE_THRESHOLD = 0.7; // Set a default confidence threshold

export async function processForObjects(mediaItem: MediaWithRelations) {
  console.log('has objects: ', !!mediaItem.analysis_data?.objects.length);
  const startTime = Date.now();

  const tensorflowServerUrl =
    process.env.TENSORFLOW_SERVER_URL ||
    'http://image-server:8501/v1/models/mobilenet_v2:predict';

  // Fetch the image
  const imageResponse = await fetch(
    mediaItem.thumbnail_data?.thumbnail_url || '',
  );
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  // Use sharp to decode and get raw pixel data (RGB)
  const image = sharp(imageBuffer).removeAlpha();
  const { width, height } = await image.metadata();
  const raw = await image.raw().toBuffer();

  // Convert raw buffer to nested array [height][width][channels]
  const channels = 3; // RGB
  const imageArray: number[][][] = [];
  for (let y = 0; y < height!; y++) {
    const row: number[][] = [];
    for (let x = 0; x < width!; x++) {
      const idx = (y * width! + x) * channels;
      row.push([
        raw[idx], // R
        raw[idx + 1], // G
        raw[idx + 2], // B
      ]);
    }
    imageArray.push(row);
  }

  // Basic analysis
  const objectFetch = await fetch(tensorflowServerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [imageArray],
      params: {
        confidence_threshold: CONFIDENCE_THRESHOLD, // Add the confidence threshold
      },
    }),
  });

  if (!objectFetch.ok) {
    throw new Error('Failed to fetch object data');
  }
  const objectsResponse = await objectFetch.json();

  const predictions = objectsResponse.predictions[0] as TensorflowPredictions;

  // Map detectedObjects to labels
  const detectedObjects = predictions.detection_boxes
    .map((box, index) => ({
      label: cocoLabels[predictions.detection_classes[index] - 1] || 'unknown',
      score: predictions.detection_scores[index],
      box: {
        top: box[0] * height!,
        left: box[1] * width!,
        bottom: box[2] * height!,
        right: box[3] * width!,
      },
    }))
    .filter((d) => d.score > 0.5);

  const { error: upsertError } = await saveDetectedObjects(
    mediaItem,
    detectedObjects,
  );

  if (upsertError) {
    throw new Error(
      `Failed to upsert analysis data: ${(upsertError as Error).message}`,
    );
  }

  const { error: updateError } = await setMediaAsBasicAnalysisProcessed(
    mediaItem.id,
  );

  if (updateError) {
    throw new Error(`Failed to update media status: ${updateError.message}`);
  }

  const endTime = Date.now();
  const processingTime = endTime - startTime;

  return { success: true, processingTime };
}

const cocoLabels = [
  'person',
  'bicycle',
  'car',
  'motorcycle',
  'airplane',
  'bus',
  'train',
  'truck',
  'boat',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'suitcase',
  'frisbee',
  'skis',
  'snowboard',
  'sports ball',
  'kite',
  'baseball bat',
  'baseball glove',
  'skateboard',
  'surfboard',
  'tennis racket',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'orange',
  'broccoli',
  'carrot',
  'hot dog',
  'pizza',
  'donut',
  'cake',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'dining table',
  'toilet',
  'tv',
  'laptop',
  'mouse',
  'remote',
  'keyboard',
  'cell phone',
  'microwave',
  'oven',
  'toaster',
  'sink',
  'refrigerator',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
];

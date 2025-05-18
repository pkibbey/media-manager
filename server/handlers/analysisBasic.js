import tf from '@tensorflow/tfjs-node-gpu';
import cocoSsdModel from '../model/cocoSsdModel.js';

export default async function analysisBasicHandler(_request, _reply) {
  // Get image url from request body
  const { imageUrl } = _request.body;
  if (!imageUrl) {
    return { error: 'Image URL is required' };
  }

  // Load the image from an http URL
  const response = await fetch(imageUrl);
  if (!response.ok) {
    return { error: 'Failed to fetch image' };
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const input = tf.node.decodeJpeg(buffer);

  // Use the preloaded model
  if (!cocoSsdModel.value) {
    return {
      error: 'Model is not loaded yet. Please try again in a moment.',
    };
  }
  const objects = await cocoSsdModel.value.detect(input);
  const objectsWithBoundingBoxes = objects.map((object) => ({
    ...object,
    bbox: {
      x: object.bbox[0],
      y: object.bbox[1],
      width: object.bbox[2],
      height: object.bbox[3],
    },
  }));
  return objectsWithBoundingBoxes;
}

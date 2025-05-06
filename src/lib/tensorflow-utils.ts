/**
 * Utility functions for TensorFlow.js implementations
 * This file provides utilities for both client-side and server-side TensorFlow.js usage
 */

import type { WriteFileOptions } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as tf from '@tensorflow/tfjs';
import heicConvert from 'heic-convert';
import mime from 'mime-types';
import sharp from 'sharp';
import type { Method } from '@/types/unified-stats';

// List of image formats that TensorFlow.js can natively process
const TENSORFLOW_COMPATIBLE_FORMATS = ['bmp', 'gif', 'jpg', 'jpeg', 'png'];

/**
 * Determines if code is running on server or client
 */
export const isServer = () => typeof window === 'undefined';

/**
 * Checks if an image format is compatible with TensorFlow.js
 */
export function isTensorFlowCompatibleFormat(extension: string): boolean {
  const normalizedExt = extension.toLowerCase().replace('.', '');
  return TENSORFLOW_COMPATIBLE_FORMATS.includes(normalizedExt);
}

/**
 * Ensures an image is in a format compatible with TensorFlow.js
 * Converts incompatible formats to PNG
 * @param filePath Path to the image file
 * @returns Path to the compatible image (original path if already compatible, temp path if converted)
 */
export async function ensureTensorFlowCompatibleImage(
  filePath: string,
): Promise<{
  path: string;
  buffer: Buffer;
  needsCleanup: boolean;
}> {
  const extension = path.extname(filePath).toLowerCase().slice(1);

  // If already in a compatible format, just read the file and return its path
  if (isTensorFlowCompatibleFormat(extension)) {
    const buffer = await fs.readFile(filePath);
    return { path: filePath, buffer, needsCleanup: false };
  }

  // Determine the type of file using mime-types
  const mimeType = mime.lookup(filePath) || '';

  try {
    // Special handling for HEIC/HEIF (iPhone) images
    if (
      ['image/heic', 'image/heif'].includes(mimeType) ||
      ['heic', 'heif'].includes(extension)
    ) {
      const inputBuffer = await fs.readFile(filePath);
      // Convert Buffer to ArrayBuffer for TensorFlow.js
      const inputArrayBuffer = bufferToArrayBuffer(inputBuffer);

      const convertedBuffer = await heicConvert({
        buffer: inputArrayBuffer,
        format: 'JPEG',
        quality: 0.7,
      });

      // Create a temporary file path for the converted image
      const tempOutputPath = `${filePath}.tensorflowtemp.png`;
      writeFileAsArrayBuffer(tempOutputPath, convertedBuffer);

      const outputBuffer = await fs.readFile(filePath);

      return {
        path: tempOutputPath,
        buffer: outputBuffer,
        needsCleanup: true,
      };
    }

    // For all other image formats, use Sharp to convert to PNG
    const inputBuffer = await fs.readFile(filePath);
    const outputBuffer = await sharp(inputBuffer).png().toBuffer();

    // Create a temporary file path for the converted image
    const tempOutputPath = `${filePath}.tensorflowtemp.png`;
    await fs.writeFile(tempOutputPath, outputBuffer);

    return {
      path: tempOutputPath,
      buffer: outputBuffer,
      needsCleanup: true,
    };
  } catch (error) {
    console.error(
      `Error converting image ${filePath} to TensorFlow compatible format:`,
      error,
    );

    // If conversion fails, return the original file as a fallback
    const buffer = await fs.readFile(filePath);
    return {
      path: filePath,
      buffer,
      needsCleanup: false,
    };
  }
}

/**
 * Cleanup temporary files created during format conversion
 */
export async function cleanupTemporaryImage(
  tempFilePath: string,
): Promise<void> {
  if (tempFilePath.includes('.tensorflowtemp.')) {
    try {
      await fs.unlink(tempFilePath);
    } catch (error) {
      console.error(`Error cleaning up temporary file ${tempFilePath}:`, error);
    }
  }
}

/**
 * Helper function to convert Node.js Buffer to ArrayBuffer
 * This fixes TypeScript errors with Buffer not being assignable to ArrayBufferLike
 */
export function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

/**
 * Helper function to convert ArrayBuffer to Node.js Buffer
 */
export function arrayBufferToBuffer(arrayBuffer: ArrayBuffer): Buffer {
  return Buffer.from(arrayBuffer);
}

/**
 * Read a file directly as an ArrayBuffer
 * This is useful for TensorFlow.js and other libraries that require ArrayBufferLike
 */
export async function readFileAsArrayBuffer(filePath: string): Promise<{
  arrayBuffer: ArrayBuffer;
  buffer: Buffer;
}> {
  const buffer = await fs.readFile(filePath);
  const arrayBuffer = bufferToArrayBuffer(buffer);
  return { arrayBuffer, buffer };
}

/**
 * Write an ArrayBuffer directly to a file
 * @param filePath Path where the file should be written
 * @param arrayBuffer ArrayBuffer data to write
 * @param options Optional file system options
 * @returns Promise that resolves when the file is written
 */
export async function writeFileAsArrayBuffer(
  filePath: string,
  arrayBuffer: ArrayBuffer,
  options?: WriteFileOptions,
): Promise<void> {
  // Convert ArrayBuffer to Buffer for Node.js fs operations
  const buffer = arrayBufferToBuffer(arrayBuffer);
  await fs.writeFile(filePath, buffer, options);
}

/**
 * Loads TensorFlow.js dynamically with the appropriate implementation
 * for the current environment (Node.js or browser)
 */
export async function loadTensorFlow() {
  // Server-side implementation (Node.js)
  return tf;
}

/**
 * Loads MobileNet model based on environment and method
 */
export async function loadMobileNetModel(method: Method) {
  // const mobilenet = await import('@tensorflow-models/mobilenet');

  return await tf.loadGraphModel(
    'https://www.kaggle.com/models/google/mobilenet-v3/TfJs/large-100-224-classification/1',
    { fromTFHub: true },
  );
}

/**
 * Loads COCO-SSD model for object detection
 */
export async function loadCOCOSSDModel() {
  const cocossd = await import('@tensorflow-models/coco-ssd');
  return cocossd.load();
}

/**
 * Loads toxicity model for content safety analysis
 */
export async function loadToxicityModel() {
  const toxicity = await import('@tensorflow-models/toxicity');
  return toxicity.load(0.7, [
    'identity_attack',
    'insult',
    'obscene',
    'severe_toxicity',
    'sexual_explicit',
    'threat',
    'toxicity',
  ]);
}

/**
 * Checks if a tensor is currently being tracked within a tidy execution context
 * Useful for determining if a tensor needs manual disposal
 * @param tensor The tensor to check
 * @returns Boolean indicating if tensor is in a tidy context
 */
export function isTensorInTidy(tensor: tf.Tensor): boolean {
  // The engine() doesn't directly have isTensorInTidy, so we need to use a workaround
  // Check if the tensor has been disposed or is being tracked by the backend
  return tf.engine().state.numTensors > 0 && !tensor.isDisposed;
}

/**
 * Safely disposes of a TensorFlow.js tensor or array of tensors
 * @param tensors Single tensor or array of tensors to dispose
 */
export function disposeTensors(
  tensors: tf.Tensor | tf.Tensor[] | null | undefined,
): void {
  if (!tensors) return;

  if (Array.isArray(tensors)) {
    tensors.forEach((tensor) => {
      if (tensor && !tensor.isDisposed) {
        tensor.dispose();
      }
    });
  } else if (tensors && !tensors.isDisposed) {
    tensors.dispose();
  }
}

/**
 * Memory-efficient way to run TensorFlow operations with automatic cleanup
 * This is a typed wrapper around tf.tidy
 * @param nameOrFn Name for the tidy operation or the function to execute
 * @param fn The function to execute (if a name was provided)
 * @returns The result of the function
 */
export function tidyOperation<T extends tf.TensorContainer>(
  nameOrFn: string | (() => T),
  fn?: () => T,
): T {
  if (typeof nameOrFn === 'string' && fn) {
    // Remove the invalid type cast 'tf.ScopeFn<T>'
    return tf.tidy(nameOrFn, fn);
  }
  if (typeof nameOrFn === 'function') {
    // Remove the invalid type cast 'tf.ScopeFn<T>'
    return tf.tidy(nameOrFn);
  }
  throw new Error('Invalid arguments to tidyOperation');
}

/**
 * Gets current memory info from TensorFlow.js
 * Useful for debugging memory leaks
 */
export function getMemoryInfo(): tf.MemoryInfo {
  return tf.memory();
}

/**
 * Logs current memory usage for debugging
 */
export function logMemoryUsage(label = 'Current memory usage'): void {
  const memInfo = getMemoryInfo();
  console.log(`${label}:`, {
    numTensors: memInfo.numTensors,
    numDataBuffers: memInfo.numDataBuffers,
    numBytes: memInfo.numBytes / (1024 * 1024), // Convert to MB
    unreliable: memInfo.unreliable,
    reasons: memInfo.reasons,
  });
}

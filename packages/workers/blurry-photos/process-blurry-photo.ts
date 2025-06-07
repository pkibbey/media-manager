import { createCanvas, loadImage } from 'canvas';
import { createSupabase } from 'shared';

export type BlurryPhotosMethod = 'standard' | 'auto-delete';

interface BlurryPhotoJobData {
  id: string;
  media_path: string;
  thumbnail_url: string;
  method: BlurryPhotosMethod;
}

interface ProcessResult {
  success: boolean;
  isSolidColor: boolean;
  dominantColor?: string;
  error?: string;
}

/**
 * Check if an image is all one solid color by analyzing its thumbnail
 */
export async function processBlurryPhoto(
  jobData: BlurryPhotoJobData,
): Promise<ProcessResult> {
  const { id, thumbnail_url, media_path, method } = jobData;

  try {
    console.log(`Processing blurry photo check for: ${media_path}`);

    // Load the thumbnail image
    const image = await loadImage(thumbnail_url);

    // Create a canvas to analyze the image
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the image to the canvas
    ctx.drawImage(image, 0, 0);

    // Get the image data as raw pixel array
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;

    // Check if all pixels are the same color
    const isSolidColor = checkIfSolidColor(pixels);

    // Check if image is mostly uniform (even if not perfectly solid)
    const isLowContent =
      !isSolidColor && checkIfLowContent(pixels, image.width, image.height);

    // Get the dominant color
    const dominantColor =
      isSolidColor || isLowContent
        ? `rgb(${pixels[0]}, ${pixels[1]}, ${pixels[2]})`
        : undefined;

    // Determine the processing result
    const processResult = isSolidColor
      ? 'solid_color'
      : isLowContent
        ? 'low_content'
        : 'normal';

    // Update the database with the processing result
    const supabase = createSupabase();
    const { error: updateError } = await supabase
      .from('media')
      .update({
        blurry_photo_process: processResult,
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Handle low content images similar to solid color ones
    if (isSolidColor || isLowContent) {
      console.log(
        `Found ${isSolidColor ? 'solid color' : 'low content'} image: ${media_path} (${dominantColor})`,
      );

      // Process based on the specified method
      switch (method) {
        case 'standard':
          // Just mark as problematic, no automatic actions
          break;
        case 'auto-delete': {
          const { error: deleteError } = await supabase
            .from('media')
            .update({ is_deleted: true })
            .eq('id', id);

          if (deleteError) {
            throw deleteError;
          }

          console.log(
            `Auto-deleted ${isSolidColor ? 'solid color' : 'low content'} image: ${media_path}`,
          );
          break;
        }
        default:
          throw new Error(`Unknown blurry photos processing method: ${method}`);
      }
    }

    return {
      success: true,
      isSolidColor: isSolidColor || isLowContent,
      dominantColor,
    };
  } catch (error) {
    console.error(`Error processing blurry photo ${media_path}:`, error);

    // Update database with error status
    try {
      const supabase = createSupabase();
      await supabase
        .from('media')
        .update({
          blurry_photo_process: 'error',
        })
        .eq('id', id);
    } catch (dbError) {
      console.error('Failed to update error status:', dbError);
    }

    return {
      success: false,
      isSolidColor: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if all pixels in the image data array are the same color
 */
function checkIfSolidColor(pixels: Uint8ClampedArray): boolean {
  if (pixels.length < 4) return false;

  // Get the first pixel's RGB values (ignore alpha for now)
  const [r, g, b] = [pixels[0], pixels[1], pixels[2]];

  // Check every 4th value (RGBA format) to compare RGB values
  for (let i = 4; i < pixels.length; i += 4) {
    if (pixels[i] !== r || pixels[i + 1] !== g || pixels[i + 2] !== b) {
      return false;
    }
  }

  return true;
}

/**
 * Check if image has very low content (mostly uniform with minor variations)
 */
function checkIfLowContent(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  const totalPixels = pixels.length / 4;

  // Method 1: Color variance analysis
  const colorVariance = calculateColorVariance(pixels);
  const lowVarianceThreshold = 100; // Adjust based on testing

  // Method 2: Edge detection (simplified)
  const edgeScore = calculateSimpleEdgeScore(pixels, width, height);
  const lowEdgeThreshold = 0.05; // Less than 5% of pixels are edges

  // Method 3: Unique color count
  const uniqueColors = countUniqueColors(pixels);
  const maxUniqueColors = Math.min(10, totalPixels * 0.01); // Max 1% unique colors or 10

  // Method 4: Dominant color percentage
  const dominantColorPercentage = calculateDominantColorPercentage(pixels);
  const dominantThreshold = 0.95; // 95% of pixels are similar to dominant color

  return (
    colorVariance < lowVarianceThreshold ||
    edgeScore < lowEdgeThreshold ||
    uniqueColors < maxUniqueColors ||
    dominantColorPercentage > dominantThreshold
  );
}

/**
 * Calculate color variance across the image
 */
function calculateColorVariance(pixels: Uint8ClampedArray): number {
  const totalPixels = pixels.length / 4;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  // Calculate means
  for (let i = 0; i < pixels.length; i += 4) {
    sumR += pixels[i];
    sumG += pixels[i + 1];
    sumB += pixels[i + 2];
  }

  const meanR = sumR / totalPixels;
  const meanG = sumG / totalPixels;
  const meanB = sumB / totalPixels;

  // Calculate variance
  let varianceSum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const diffR = pixels[i] - meanR;
    const diffG = pixels[i + 1] - meanG;
    const diffB = pixels[i + 2] - meanB;
    varianceSum += diffR * diffR + diffG * diffG + diffB * diffB;
  }

  return varianceSum / totalPixels;
}

/**
 * Simple edge detection by checking pixel differences
 */
function calculateSimpleEdgeScore(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  let edgePixels = 0;
  const threshold = 30; // Minimum difference to consider an edge

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const currentIndex = (y * width + x) * 4;
      const rightIndex = (y * width + (x + 1)) * 4;
      const bottomIndex = ((y + 1) * width + x) * 4;

      // Check horizontal difference
      const horizontalDiff =
        Math.abs(pixels[currentIndex] - pixels[rightIndex]) +
        Math.abs(pixels[currentIndex + 1] - pixels[rightIndex + 1]) +
        Math.abs(pixels[currentIndex + 2] - pixels[rightIndex + 2]);

      // Check vertical difference
      const verticalDiff =
        Math.abs(pixels[currentIndex] - pixels[bottomIndex]) +
        Math.abs(pixels[currentIndex + 1] - pixels[bottomIndex + 1]) +
        Math.abs(pixels[currentIndex + 2] - pixels[bottomIndex + 2]);

      if (horizontalDiff > threshold || verticalDiff > threshold) {
        edgePixels++;
      }
    }
  }

  return edgePixels / ((width - 1) * (height - 1));
}

/**
 * Count unique colors (with tolerance for similar colors)
 */
function countUniqueColors(pixels: Uint8ClampedArray): number {
  const colorSet = new Set<string>();
  const tolerance = 5; // Colors within this range are considered the same

  for (let i = 0; i < pixels.length; i += 4) {
    // Round colors to tolerance level
    const r = Math.round(pixels[i] / tolerance) * tolerance;
    const g = Math.round(pixels[i + 1] / tolerance) * tolerance;
    const b = Math.round(pixels[i + 2] / tolerance) * tolerance;
    colorSet.add(`${r},${g},${b}`);
  }

  return colorSet.size;
}

/**
 * Calculate what percentage of pixels are similar to the dominant color
 */
function calculateDominantColorPercentage(pixels: Uint8ClampedArray): number {
  // Find the dominant color (most frequent)
  const colorCounts = new Map<string, number>();
  const tolerance = 10;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = Math.round(pixels[i] / tolerance) * tolerance;
    const g = Math.round(pixels[i + 1] / tolerance) * tolerance;
    const b = Math.round(pixels[i + 2] / tolerance) * tolerance;
    const colorKey = `${r},${g},${b}`;

    colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
  }

  // Find the most frequent color
  let maxCount = 0;
  for (const count of colorCounts.values()) {
    if (count > maxCount) {
      maxCount = count;
    }
  }

  const totalPixels = pixels.length / 4;
  return maxCount / totalPixels;
}

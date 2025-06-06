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

    // Get the dominant color if it's solid
    const dominantColor = isSolidColor
      ? `rgb(${pixels[0]}, ${pixels[1]}, ${pixels[2]})`
      : undefined;

    // Update the database with the processing result
    const supabase = createSupabase();
    const { error: updateError } = await supabase
      .from('media')
      .update({
        blurry_photo_process: isSolidColor ? 'solid_color' : 'normal',
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // If it's a solid color image, handle based on method
    if (isSolidColor) {
      console.log(`Found solid color image: ${media_path} (${dominantColor})`);

      // Process based on the specified method
      switch (method) {
        case 'standard':
          // Just mark as solid color, no automatic actions
          break;
        case 'auto-delete': {
          const { error: deleteError } = await supabase
            .from('media')
            .update({ is_deleted: true })
            .eq('id', id);

          if (deleteError) {
            throw deleteError;
          }

          console.log(`Auto-deleted solid color image: ${media_path}`);
          break;
        }
        default:
          throw new Error(`Unknown blurry photos processing method: ${method}`);
      }
    }

    return {
      success: true,
      isSolidColor,
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

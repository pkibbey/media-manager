import sharp from 'sharp';

/**
 * Extract dominant colors from an image buffer
 */
export default async function extractDominantColors(imageUrl: string) {
  let sharpInstance = null;
  
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    // Get the image data as a buffer
    const imageBuffer = await response.arrayBuffer();

    // Process the image buffer with sharp
    sharpInstance = sharp(Buffer.from(imageBuffer));
    const { dominant: dominantRGB } = await sharpInstance.stats();
    
    const hexColor = `#${dominantRGB.r.toString(16).padStart(2, '0')}${dominantRGB.g.toString(16).padStart(2, '0')}${dominantRGB.b.toString(16).padStart(2, '0')}`;

    // Convert to hex colors and return
    return [hexColor];
  } catch (error) {
    console.error('Error extracting colors:', error);
    return [];
  } finally {
    // Explicitly clean up Sharp instance
    if (sharpInstance) {
      // Remove references to internal data
      sharpInstance.destroy();
      sharpInstance = null;
    }
  }
}

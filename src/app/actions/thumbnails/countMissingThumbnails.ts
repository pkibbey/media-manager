'use server';

import { getDetailedFileTypeInfo } from '@/lib/file-types-utils';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Count the number of media items missing thumbnails
 */
export async function countMissingThumbnails(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get file type IDs for supported image formats
    const fileTypeInfo = await getDetailedFileTypeInfo();
    if (!fileTypeInfo) {
      throw new Error('Failed to load file type information');
    }

    // Define supported image formats and get their IDs
    const supportedImageFormats = [
      'jpg',
      'jpeg',
      'png',
      'webp',
      'gif',
      'tiff',
      'tif',
      'heic',
      'avif',
      'bmp',
    ];

    const supportedImageIds = supportedImageFormats
      .map((ext) => fileTypeInfo.extensionToId.get(ext))
      .filter((id) => id !== undefined) as number[];

    // Instead of collecting all IDs and using a NOT IN clause, we'll use a more efficient approach
    // that counts media items using pagination and dynamic filtering

    // First, get a count of all supported images
    const { count: totalImageCount, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .in('file_type_id', supportedImageIds);

    if (countError) {
      throw new Error(`Failed to count total images: ${countError.message}`);
    }

    // Second, get a count of the processed thumbnails
    const { count: processedCount, error: processedError } = await supabase
      .from('processing_states')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'thumbnail')
      .in('status', ['success', 'skipped']);

    if (processedError) {
      throw new Error(
        `Failed to count processed thumbnails: ${processedError.message}`,
      );
    }

    // Calculate the difference - this is how many images need thumbnails
    // This approach avoids URI length limits completely
    const missingCount = (totalImageCount || 0) - (processedCount || 0);

    return {
      success: true,
      count: Math.max(0, missingCount), // Ensure we don't return a negative count
    };
  } catch (error: any) {
    console.error('Error counting missing thumbnails:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

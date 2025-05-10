'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Get statistics about thumbnail processing
 *
 * @returns Object with thumbnail processing statistics
 */
export async function getThumbnailStats() {
  try {
    const supabase = createSupabase();

    // Get the total count of all media items
    const { count: totalCount, error: totalError } = await supabase
      .from('media')
      .select('id', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    // Get count of items with thumbnails
    const { count: processedCount, error: processedError } = await supabase
      .from('media')
      .select('is_thumbnail_processed', { count: 'exact', head: true })
      .is('is_thumbnail_processed', true);

    if (processedError) {
      throw new Error(
        `Failed to get processed count: ${processedError.message}`,
      );
    }

    // Calculate remaining items
    const remainingCount = (totalCount || 0) - (processedCount || 0);
    const percentComplete = totalCount
      ? Math.round(((processedCount || 0) / totalCount) * 100)
      : 0;

    // Get average thumbnail dimensions and file size
    const avgWidth = 0;
    const avgHeight = 0;
    const totalSize = 0;
    const sizeSavings = 0;

    // Get metadata about thumbnails if we have any processed
    if (processedCount && processedCount > 0) {
      // Sample query to get thumbnail metadata
      // In a real implementation, this would query actual thumbnail metadata
      const { data: thumbnailMetadata, error: metadataError } = await supabase
        .from('media')
        .select('size_bytes, thumbnail_data!left(*)')
        .is('is_thumbnail_processed', true);

      console.log('metadataError: ', metadataError);

      console.log('thumbnailMetadata: ', thumbnailMetadata);

      // if (!metadataError && thumbnailMetadata && thumbnailMetadata.length > 0) {
      //   // Calculate average dimensions
      //   const totalWidth = thumbnailMetadata.reduce(
      //     (sum, item) => sum + (item.thumbnail_data || 0),
      //     0,
      //   );
      //   const totalHeight = thumbnailMetadata.reduce(
      //     (sum, item) => sum + (item.height || 0),
      //     0,
      //   );

      //   avgWidth = totalWidth / thumbnailMetadata.length;
      //   avgHeight = totalHeight / thumbnailMetadata.length;

      //   // Estimate total file size (simplified)
      //   const avgOriginalSize =
      //     thumbnailMetadata.reduce(
      //       (sum, item) => sum + (item.file_size || 0),
      //       0,
      //     ) / thumbnailMetadata.length;
      //   const estimatedThumbnailSize = avgOriginalSize * 0.1; // Assume thumbnails are ~10% of original

      //   totalSize = estimatedThumbnailSize * processedCount;
      //   sizeSavings = avgOriginalSize * processedCount - totalSize;
      // }
    }

    return {
      stats: {
        total: totalCount || 0,
        processed: processedCount || 0,
        remaining: remainingCount,
        percentComplete,
        avgWidth,
        avgHeight,
        totalSize,
        sizeSavings,
      },
    };
  } catch (error) {
    console.error('Error getting thumbnail stats:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

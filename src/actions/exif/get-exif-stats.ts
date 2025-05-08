'use server';

import { createServer } from '@/lib/supabase';

/**
 * Get statistics about EXIF data processing
 *
 * @returns Object with EXIF processing statistics
 */
export async function getExifStats() {
  try {
    const supabase = createServer();

    // Get the total count of media items
    const { count: totalCount, error: totalError } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    // Get count of items with processed EXIF
    const { count: processedCount, error: processedError } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .eq('exif_processed', true);

    if (processedError) {
      throw new Error(
        `Failed to get processed count: ${processedError.message}`,
      );
    }

    // Calculate remaining items
    const remaining = totalCount ? totalCount - (processedCount || 0) : 0;
    const percentComplete = totalCount
      ? ((processedCount || 0) / totalCount) * 100
      : 0;

    return {
      stats: {
        total: totalCount || 0,
        processed: processedCount || 0,
        remaining,
        percentComplete: Math.round(percentComplete * 100) / 100,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting EXIF stats:', error);
    return {
      stats: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

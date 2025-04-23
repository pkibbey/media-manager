'use server';

import { includeMedia } from '@/lib/mediaFilters';
import { createServerSupabaseClient } from '@/lib/supabase';

// List of file extensions that can have thumbnails
const THUMBNAIL_COMPATIBLE_EXTENSIONS = [
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

/**
 * Get statistics about thumbnail status
 */
export async function getThumbnailStats(): Promise<{
  success: boolean;
  stats?: {
    totalCompatibleFiles: number;
    filesWithThumbnails: number;
    filesPending: number;
    skippedLargeFiles: number;
  };
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get total count of all compatible image files, excluding ignored file types
    const { count: totalCount, error: totalError } = await includeMedia(
      supabase
        .from('media_items')
        .select('*, file_types!inner(*)', { count: 'exact' })
        .in('file_types.extension', THUMBNAIL_COMPATIBLE_EXTENSIONS),
    );

    if (totalError) {
      throw new Error(`Failed to get total file count: ${totalError.message}`);
    }

    // Get count of files with successful thumbnails
    // Note: We don't need to filter by file_types.ignore here since we're only
    // looking at processing_states that were already created, and those are already
    // filtered by the time they were created
    const { count: withThumbnailsCount, error: withThumbnailsError } =
      await supabase
        .from('processing_states')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'thumbnail')
        .eq('status', 'success');

    if (withThumbnailsError) {
      throw new Error(
        `Failed to get files with thumbnails: ${withThumbnailsError.message}`,
      );
    }

    // Get count of files skipped due to being large
    const { count: skippedLargeFilesCount, error: skippedLargeFilesError } =
      await supabase
        .from('processing_states')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'thumbnail')
        .eq('status', 'skipped');

    if (skippedLargeFilesError) {
      throw new Error(
        `Failed to get skipped large files count: ${skippedLargeFilesError.message}`,
      );
    }

    // Calculate pending files by subtracting thumbnail-having files from total
    const filesPending =
      (totalCount || 0) -
      (withThumbnailsCount || 0) -
      (skippedLargeFilesCount || 0);

    return {
      success: true,
      stats: {
        totalCompatibleFiles: totalCount || 0,
        filesWithThumbnails: withThumbnailsCount || 0,
        filesPending: filesPending > 0 ? filesPending : 0,
        skippedLargeFiles: skippedLargeFilesCount || 0,
      },
    };
  } catch (error: any) {
    console.error('Error getting thumbnail stats:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

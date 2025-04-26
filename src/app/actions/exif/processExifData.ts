'use server';

import { extractAndSanitizeExifData } from '@/lib/exif-utils';
import {
  handleProcessingError,
  markProcessingError,
  markProcessingSuccess,
} from '@/lib/processing-helpers';
import { getMediaItemById, updateMediaItem } from '@/lib/query-helpers';
import type { ExtractionMethod } from '@/types/exif';
import type { Json } from '@/types/supabase';

/**
 * Process EXIF data for a single media item by ID
 * This function is used by the batch processing implementation
 */
export async function processExifData({
  mediaId,
  method,
  progressCallback,
}: {
  mediaId: string;
  method: ExtractionMethod;
  progressCallback?: (message: string) => void;
}) {
  try {
    // First get the to access its file path
    // Apply filter to exclude ignored file types
    const { data: mediaItem, error: fetchError } =
      await getMediaItemById(mediaId);

    if (fetchError || !mediaItem) {
      return {
        success: false,
        message: fetchError?.message || 'Media item not found',
      };
    }

    // Extract EXIF data
    const extraction = await extractAndSanitizeExifData(
      mediaItem.file_path,
      method,
      progressCallback,
    );

    // If no EXIF data found, update processing state accordingly
    if (!extraction.success || !extraction.exifData) {
      progressCallback?.('No EXIF data found in file');

      // Use the new helper function for skipping items
      await markProcessingError({
        mediaItemId: mediaId,
        type: 'exif',
        error: extraction.message || 'No EXIF data found in file',
      });

      return {
        success: false,
        message:
          extraction.message ||
          'No EXIF data could be extracted, but item marked as processed',
      };
    }

    try {
      // Update the exif processing state
      await markProcessingSuccess({
        mediaItemId: mediaId,
        type: 'exif',
        message: 'EXIF data extracted successfully',
      });

      // Update the media record with the actual EXIF data
      progressCallback?.('Updating media item with EXIF data');
      const { error: updateError } = await updateMediaItem(mediaId, {
        exif_data: extraction.sanitizedExifData as Json,
        media_date: extraction.mediaDate,
      });

      if (updateError) throw updateError;
    } catch (txError) {
      const errorMessage = `Database update error: ${txError instanceof Error ? txError.message : 'Unknown error'}`;
      progressCallback?.(errorMessage);

      // Use our new helper function for error processing
      return await handleProcessingError({
        mediaItemId: mediaId,
        type: 'exif',
        error: txError,
      });
    }

    progressCallback?.('EXIF data extraction completed successfully');
    return {
      success: true,
      message: 'EXIF data extracted and stored successfully',
      exifData: extraction.exifData,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error processing EXIF data';
    progressCallback?.(`Error processing EXIF: ${errorMessage}`);

    // Use our new helper function for error processing
    return await handleProcessingError({
      mediaItemId: mediaId,
      type: 'exif',
      error,
    });
  }
}

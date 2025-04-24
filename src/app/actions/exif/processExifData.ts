'use server';

import { extractAndSanitizeExifData } from '@/lib/exif-utils';
import {
  getMediaItemById,
  updateMediaItem,
  updateProcessingState,
} from '@/lib/query-helpers';
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
    progressCallback?.('Fetching media item details');

    // First get the to access its file path
    // Apply filter to exclude ignored file types
    const { data: mediaItem, error: fetchError } =
      await getMediaItemById(mediaId);

    if (fetchError || !mediaItem) {
      console.error('Error fetching media item:', fetchError);
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
      await updateProcessingState(mediaId, 'error', 'exif', extraction.message);

      return {
        success: false,
        message:
          extraction.message ||
          'No EXIF data could be extracted, but item marked as processed',
      };
    }

    try {
      // Update the exif processing state
      const { error: stateError } = await updateProcessingState(
        mediaId,
        'success',
        'exif',
        'EXIF data extracted successfully',
      );
      if (stateError) throw stateError;

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

      // Attempt to mark the processing state as error
      try {
        await updateProcessingState(mediaId, 'error', 'exif', errorMessage);
      } catch (stateUpdateError) {
        console.error(
          "Failed to update processing state to 'error':",
          stateUpdateError,
        );
      }

      console.error('Error updating media item:', txError);

      return {
        success: false,
        message:
          txError instanceof Error ? txError.message : 'Database update error',
      };
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
    progressCallback?.(`Error: ${errorMessage}`);
    console.error('Error processing EXIF data:', error);

    // Record the error in processing_states table
    try {
      await updateProcessingState(mediaId, 'error', 'exif', errorMessage);
    } catch (updateError) {
      console.error('Error updating processed state:', updateError);
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
}

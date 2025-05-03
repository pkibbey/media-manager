'use server';

import type { Tags } from 'exifreader';
import { getMediaItemById } from '@/actions/media/get-media-item-by-id';
import {
  extractAndSanitizeExifData,
  uploadExifThumbnail,
} from '@/lib/exif-utils';
import {
  handleProcessingError,
  markProcessingError,
  markProcessingSuccess,
} from '@/lib/processing-helpers';
import type { Json } from '@/types/supabase';
import type { Method } from '@/types/unified-stats';
import { updateMediaItem } from '../media/update-media-item';

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
  method: Method;
  progressCallback?: (message: string) => void;
}): Promise<{
  success: boolean;
  message: string;
  exifData?: Tags;
}> {
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
        progressType: 'exif',
        errorMessage: extraction.message || 'No EXIF data found in file',
      });

      return {
        success: false,
        message: extraction.message || 'No EXIF data found in file',
      };
    }

    try {
      // Update the media record with the actual EXIF data
      progressCallback?.('Updating media item with EXIF data');
      const { error: updateError } = await updateMediaItem(mediaId, {
        exif_data: extraction.sanitizedExifData as Json,
        media_date: extraction.mediaDate,
      });

      if (updateError) {
        // Instead of throwing, handle it directly
        const errorMessage = `Database update error: ${updateError.message}`;
        progressCallback?.(errorMessage);

        await handleProcessingError({
          mediaItemId: mediaId,
          progressType: 'exif',
          errorMessage: String(updateError),
        });

        return {
          success: false,
          message: errorMessage,
        };
      }

      let thumbnailMessage = 'No EXIF thumbnail found';

      if (extraction.thumbnailBuffer) {
        progressCallback?.('EXIF thumbnail found, uploading to storage');
        try {
          // Upload the thumbnail
          const thumbnailResult = await uploadExifThumbnail(
            mediaId,
            extraction.thumbnailBuffer,
          );

          if (thumbnailResult.success) {
            thumbnailMessage = `EXIF thumbnail uploaded: ${thumbnailResult.thumbnailUrl}`;
            progressCallback?.(thumbnailMessage);
          } else {
            thumbnailMessage = `EXIF thumbnail upload failed: ${thumbnailResult.message}`;
            progressCallback?.(thumbnailMessage);
            // Don't fail the entire process if just the thumbnail upload fails
            // Consider it a soft error
          }
        } catch (thumbnailError) {
          thumbnailMessage = `Error uploading EXIF thumbnail: ${thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError)}`;
          progressCallback?.(thumbnailMessage);
          // Again, don't fail the entire process
        }
      }

      // Now that all operations are complete, mark as successful
      await markProcessingSuccess({
        mediaItemId: mediaId,
        progressType: 'exif',
        errorMessage: `EXIF data extracted successfully. ${thumbnailMessage}`,
      });

      progressCallback?.('EXIF data extraction completed successfully');
      return {
        success: true,
        message: 'EXIF data extracted and stored successfully',
        exifData: extraction.exifData,
      };
    } catch (error) {
      const errorMessage = `Database update error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      progressCallback?.(errorMessage);

      // Use our new helper function for error processing
      await handleProcessingError({
        mediaItemId: mediaId,
        progressType: 'exif',
        errorMessage,
      });
      return {
        success: false,
        message: errorMessage,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error processing EXIF data';
    progressCallback?.(`Error processing EXIF: ${errorMessage}`);

    // Use our new helper function for error processing
    await handleProcessingError({
      mediaItemId: mediaId,
      progressType: 'exif',
      errorMessage,
    });

    return {
      success: false,
      message: errorMessage,
    };
  }
}

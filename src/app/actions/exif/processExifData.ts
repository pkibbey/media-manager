/** biome-ignore-all lint/style/noUnusedTemplateLiteral: Temporary Fix */

'use server';

import type { Tags } from 'exifreader';
import { getMediaItemById } from '@/actions/media/get-media-item-by-id';
import {
  extractAndSanitizeExifData,
  uploadExifThumbnail,
} from '@/lib/exif-utils';
import {
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
      console.warn(`[EXIF] Media item not found or fetch error`, {
        fetchError,
        mediaId,
      });
      return {
        success: false,
        message: fetchError?.message || 'Media item not found',
      };
    }

    // Extract EXIF data
    const extraction = await extractAndSanitizeExifData(
      mediaItem.file_path,
      method,
    );

    // If no EXIF data found, update processing state accordingly
    if (!extraction.success || !extraction.exifData) {
      const errorMessage = extraction.message || 'No EXIF data found in file';

      await markProcessingError({
        mediaItemId: mediaId,
        progressType: 'exif',
        errorMessage,
      });
      return {
        success: false,
        message: errorMessage,
      };
    }

    try {
      // Update the media record with the actual EXIF data
      const { error: updateError } = await updateMediaItem(mediaId, {
        exif_data: extraction.sanitizedExifData as Json,
        media_date: extraction.mediaDate,
      });

      if (updateError) {
        const errorMessage = `Database update error: ${updateError.message}`;

        await markProcessingError({
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
        try {
          // Upload the thumbnail
          const thumbnailResult = await uploadExifThumbnail(
            mediaId,
            extraction.thumbnailBuffer,
          );
          if (thumbnailResult.success) {
            thumbnailMessage = `EXIF thumbnail uploaded: ${thumbnailResult.thumbnailUrl}`;
          } else {
            thumbnailMessage = `EXIF thumbnail upload failed: ${thumbnailResult.message}`;
            // Don't fail the entire process if just the thumbnail upload fails
            // Consider it a soft error
          }
        } catch (thumbnailError) {
          thumbnailMessage = `Error uploading EXIF thumbnail: ${thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError)}`;
          // Don't return here, or it will fail the entire process
        }
      }

      progressCallback?.(thumbnailMessage);

      // Now that all operations are complete, mark as successful
      await markProcessingSuccess({
        mediaItemId: mediaId,
        progressType: 'exif',
        errorMessage: `EXIF data extracted successfully. ${thumbnailMessage}`,
      });

      return {
        success: true,
        message: 'EXIF data extracted and stored successfully',
        exifData: extraction.exifData,
      };
    } catch (error) {
      const errorMessage = `Database update error: ${error instanceof Error ? error.message : 'Unknown error'}`;

      await markProcessingError({
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

    await markProcessingError({
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

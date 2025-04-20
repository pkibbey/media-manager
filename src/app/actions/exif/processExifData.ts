'use server';

import fs from 'node:fs/promises';
import { extractMetadata } from '@/lib/exif-utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ExtractionMethod } from '@/types/exif';

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
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    progressCallback?.('Fetching media item details');

    // First get the media item to access its file path
    const { data: mediaItem, error: fetchError } = await supabase
      .from('media_items')
      .select('file_path, file_name')
      .eq('id', mediaId)
      .single();

    if (fetchError || !mediaItem) {
      console.error('Error fetching media item:', fetchError);
      return {
        success: false,
        message: fetchError?.message || 'Media item not found',
      };
    }

    const filePath = mediaItem.file_path;
    progressCallback?.(`Processing ${mediaItem.file_name}`);

    // Check if file exists
    try {
      progressCallback?.('Checking file access');
      await fs.access(filePath);
    } catch (fileError) {
      progressCallback?.('File not found');

      // Insert error state into processing_states table
      await supabase.from('processing_states').upsert({
        media_item_id: mediaId,
        type: 'exif',
        status: 'error',
        processed_at: new Date().toISOString(),
        error_message: `File not found: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
        metadata: { method },
      });

      return {
        success: false,
        message: `File not found: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
      };
    }

    // Extract EXIF data from the file
    progressCallback?.(`Extracting metadata using ${method} method`);
    const exifData = await extractMetadata({ filePath, method });

    // If no EXIF data found, update processing state accordingly
    if (!exifData) {
      progressCallback?.('No EXIF data found in file');

      // Insert skipped state into processing_states table
      await supabase.from('processing_states').upsert({
        media_item_id: mediaId,
        type: 'exif',
        status: 'success', // Still mark as success, just no EXIF found
        processed_at: new Date().toISOString(),
        metadata: { method },
      });

      return {
        success: false,
        message:
          'No EXIF data could be extracted, but item marked as processed',
      };
    }

    // Import sanitizeExifData function
    progressCallback?.('Sanitizing EXIF data');
    const { sanitizeExifData } = await import('@/lib/utils');

    // Sanitize EXIF data before storing it
    const sanitizedExifData = sanitizeExifData(exifData);

    // Get media date from EXIF
    const mediaDate =
      exifData.Photo?.DateTimeOriginal?.toISOString() ||
      exifData.Image?.DateTime?.toISOString();

    try {
      // Update the exif processing state
      progressCallback?.('Updating processing state');
      const { error: stateError } = await supabase
        .from('processing_states')
        .upsert({
          media_item_id: mediaId,
          type: 'exif',
          status: 'success',
          processed_at: new Date().toISOString(),
          metadata: { method },
        });
      if (stateError) throw stateError; // Throw error to be caught below

      // If we have a date from EXIF, also update dateCorrection state
      if (mediaDate) {
        progressCallback?.('Updating date correction state');
        const { error: dateStateError } = await supabase
          .from('processing_states')
          .upsert({
            media_item_id: mediaId,
            type: 'dateCorrection',
            status: 'success',
            processed_at: new Date().toISOString(),
            metadata: { source: 'exif' },
          });
        if (dateStateError) throw dateStateError; // Throw error
      }

      // Update the media record with the actual EXIF data
      progressCallback?.('Updating media item with EXIF data');
      const { error: updateError } = await supabase
        .from('media_items')
        .update({
          exif_data: sanitizedExifData,
          media_date: mediaDate,
        })
        .eq('id', mediaId);

      if (updateError) {
        throw updateError; // This will trigger the catch block
      }
    } catch (txError) {
      progressCallback?.(
        `Database update error: ${txError instanceof Error ? txError.message : 'Unknown error'}`,
      );
      console.error(
        'Error updating media or processing state with EXIF data:',
        txError,
      );

      // Attempt to mark the processing state as error
      try {
        await supabase.from('processing_states').upsert({
          media_item_id: mediaId,
          type: 'exif',
          status: 'error',
          processed_at: new Date().toISOString(),
          error_message: `Database update error: ${txError instanceof Error ? txError.message : 'Unknown error'}`,
          metadata: { method },
        });
      } catch (stateUpdateError) {
        console.error(
          "Failed to update processing state to 'error' after initial update failure:",
          stateUpdateError,
        );
      }

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
      exifData,
    };
  } catch (error) {
    progressCallback?.(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    console.error('Error processing EXIF data:', error);

    // Even on error, record the error in processing_states table
    try {
      const supabase = createServerSupabaseClient();
      await supabase.from('processing_states').upsert({
        media_item_id: mediaId,
        type: 'exif',
        status: 'error',
        processed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (updateError) {
      console.error('Error updating processed state:', updateError);
    }

    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

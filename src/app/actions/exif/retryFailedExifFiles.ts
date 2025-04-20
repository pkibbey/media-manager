'use server';

import { isAborted } from '@/lib/abort-tokens';
import { BATCH_SIZE } from '@/lib/consts';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ExtractionMethod } from '@/types/exif';
import { revalidatePath } from 'next/cache';
import { processExifData } from './processExifData';

/**
 * Retry EXIF extraction for files that previously failed
 * Server-compatible implementation without client references
 */
export async function retryFailedExifFiles(
  fileIds: string[],
  options: {
    method?: ExtractionMethod;
    skipLargeFiles?: boolean;
    abortToken?: string;
  } = {},
  onProgress?: (processed: number, message?: string) => void,
) {
  try {
    const supabase = createServerSupabaseClient();
    let successCount = 0;
    let processedCount = 0;
    let skippedLargeFiles = 0;
    const { method = 'default', skipLargeFiles = true, abortToken } = options;

    // Process files one by one
    for (const fileId of fileIds) {
      // Check for abort token (server-side version)
      if (abortToken) {
        try {
          const abortRequested = await isAborted(abortToken);
          if (abortRequested) {
            return {
              success: false,
              message: 'Operation was aborted by user',
              processedCount,
              successCount,
              skippedLargeFiles,
            };
          }
        } catch (error) {
          console.error('Error checking abort status:', error);
          // Continue processing even if abort check fails
        }
      }

      try {
        // Reset the processing state for this file in the processing_states table
        await supabase.from('processing_states').upsert({
          media_item_id: fileId,
          type: 'exif',
          status: 'pending', // Set to pending to mark it for reprocessing
          processed_at: new Date().toISOString(),
          error_message: null, // Clear any previous errors
          metadata: { method },
        });

        // Get file info if we need to check file size
        if (skipLargeFiles) {
          const { data: mediaItem } = await supabase
            .from('media_items')
            .select('file_path, size_bytes')
            .eq('id', fileId)
            .single();

          if (!mediaItem) {
            console.warn(`Media item ${fileId} not found`);
            continue;
          }

          // Skip large files if requested
          if (
            skipLargeFiles &&
            mediaItem.size_bytes &&
            mediaItem.size_bytes > BATCH_SIZE * 1024 * 1024 // Use batch size as threshold
          ) {
            skippedLargeFiles++;

            // Update the processing state to indicate it was skipped
            await supabase.from('processing_states').upsert({
              media_item_id: fileId,
              type: 'exif',
              status: 'skipped',
              processed_at: new Date().toISOString(),
              error_message: `Skipped large file (${Math.round(mediaItem.size_bytes / 1024 / 1024)}MB)`,
              metadata: { method },
            });

            continue;
          }
        }

        // Check for abort token again before starting the actual processing
        if (abortToken) {
          try {
            const abortRequested = await isAborted(abortToken);
            if (abortRequested) {
              return {
                success: false,
                message: 'Operation was aborted by user',
                processedCount,
                successCount,
                skippedLargeFiles,
              };
            }
          } catch (error) {
            console.error('Error checking abort status:', error);
            // Continue if abort check fails
          }
        }

        // Process EXIF data
        const result = await processExifData({
          mediaId: fileId,
          method,
          progressCallback: (message) => {
            // If we have a progress callback from the caller, use it
            if (onProgress) {
              onProgress(processedCount, message);
            }
          },
        });

        if (result.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing EXIF for file ${fileId}:`, error);

        // Update the processing state with the error
        try {
          await supabase.from('processing_states').upsert({
            media_item_id: fileId,
            type: 'exif',
            status: 'error',
            processed_at: new Date().toISOString(),
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
            metadata: { method },
          });
        } catch (updateError) {
          console.error('Error updating processing state:', updateError);
        }

        // Continue with next file
      }

      // Update progress
      processedCount++;
      if (onProgress) {
        onProgress(processedCount);
      }
    }

    // Revalidate paths
    revalidatePath('/admin');
    revalidatePath('/browse');

    return {
      success: true,
      processedCount,
      successCount,
      skippedLargeFiles,
    };
  } catch (error: any) {
    console.error('Error retrying failed EXIF files:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

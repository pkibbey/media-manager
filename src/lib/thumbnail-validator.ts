'use server';

import path from 'node:path';
import { createServerSupabaseClient } from './supabase';

interface ValidationResult {
  success: boolean;
  inconsistencies: Array<{
    mediaId: string;
    issue: string;
    fileName?: string;
    thumbnailPath?: string;
  }>;
  totalChecked: number;
  recordsMissingThumbnailPath: number;
  recordsWithoutActualFile: number;
  recordsWithoutProcessingState: number;
  stateSuccessButNoPath: number;
  stateErrorButHasPath: number;
}

/**
 * Validate thumbnail consistency between database records and actual files
 * This function checks for common inconsistencies in the thumbnail processing state
 */
export async function validateThumbnailConsistency(
  limit = 100,
): Promise<ValidationResult> {
  const supabase = createServerSupabaseClient();
  const result: ValidationResult = {
    success: true,
    inconsistencies: [],
    totalChecked: 0,
    recordsMissingThumbnailPath: 0,
    recordsWithoutActualFile: 0,
    recordsWithoutProcessingState: 0,
    stateSuccessButNoPath: 0,
    stateErrorButHasPath: 0,
  };

  try {
    const { data: mediaItems, error: mediaError } = await supabase.rpc(
      'random_order_media_items',
      {
        limit_count: limit,
      },
    );

    if (mediaError) {
      throw new Error(`Failed to fetch media items: ${mediaError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        ...result,
        success: true,
      };
    }

    result.totalChecked = mediaItems.length;

    // For each media item, check consistency
    for (const mediaItem of mediaItems) {
      // Check 1: Media items without thumbnail_path
      if (!mediaItem.thumbnail_path) {
        result.recordsMissingThumbnailPath++;
      }

      // Get the processing state for this item
      const { data: processingState, error: stateError } = await supabase
        .from('processing_states')
        .select('*')
        .eq('media_item_id', mediaItem.id)
        .eq('type', 'thumbnail')
        .maybeSingle();

      if (stateError) {
        result.inconsistencies.push({
          mediaId: mediaItem.id,
          issue: `Error fetching processing state: ${stateError.message}`,
        });
        continue;
      }

      // Check 2: Items without a processing state record at all
      if (!processingState) {
        result.recordsWithoutProcessingState++;
        result.inconsistencies.push({
          mediaId: mediaItem.id,
          issue: 'No processing state record',
          fileName: mediaItem.file_name,
        });
        continue;
      }

      // Check 3: State shows success but no thumbnail_path
      if (processingState.status === 'complete' && !mediaItem.thumbnail_path) {
        result.stateSuccessButNoPath++;
        result.inconsistencies.push({
          mediaId: mediaItem.id,
          issue: 'Processing state shows success but no thumbnail path',
          fileName: mediaItem.file_name,
        });
      }

      // Check 4: State shows error but has thumbnail_path
      if (processingState.status === 'failure' && mediaItem.thumbnail_path) {
        result.stateErrorButHasPath++;
        result.inconsistencies.push({
          mediaId: mediaItem.id,
          issue: 'Processing state shows failure but has thumbnail path',
          fileName: mediaItem.file_name,
          thumbnailPath: mediaItem.thumbnail_path,
        });
      }

      // Check 5: If thumbnail_path exists, check if the file actually exists in storage
      if (mediaItem.thumbnail_path) {
        // For Supabase storage, we can't directly check file existence with getMetadata
        // Instead, we'll try to list files with the specific name to check existence
        try {
          const filename = path.basename(mediaItem.thumbnail_path);
          const { data: files, error: storageError } = await supabase.storage
            .from('thumbnails')
            .list('', {
              limit: 1,
              offset: 0,
              search: filename,
            });

          // If we got an error or no files matching the search
          if (storageError || !files || files.length === 0) {
            result.recordsWithoutActualFile++;
            result.inconsistencies.push({
              mediaId: mediaItem.id,
              issue: storageError
                ? `Thumbnail path exists but error checking file: ${storageError.message}`
                : 'Thumbnail path exists but file is missing in storage',
              fileName: mediaItem.file_name,
              thumbnailPath: mediaItem.thumbnail_path,
            });
          }
        } catch (storageError) {
          result.recordsWithoutActualFile++;
          result.inconsistencies.push({
            mediaId: mediaItem.id,
            issue: `Error checking file existence: ${
              storageError instanceof Error
                ? storageError.message
                : String(storageError)
            }`,
            fileName: mediaItem.file_name,
            thumbnailPath: mediaItem.thumbnail_path,
          });
        }
      }
    }

    result.success = result.inconsistencies.length === 0;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      ...result,
      success: false,
      inconsistencies: [
        {
          mediaId: 'system',
          issue: `Validation failed: ${errorMessage}`,
        },
      ],
    };
  }
}

/**
 * Fix common thumbnail inconsistencies found during validation
 */
export async function fixThumbnailInconsistencies(
  mediaIds: string[],
): Promise<{ success: boolean; results: Record<string, string> }> {
  const supabase = createServerSupabaseClient();
  const results: Record<string, string> = {};

  try {
    for (const mediaId of mediaIds) {
      // Get the media item details
      const { data: mediaItem, error: mediaError } = await supabase
        .from('media_items')
        .select('*')
        .eq('id', mediaId)
        .maybeSingle();

      if (mediaError || !mediaItem) {
        results[mediaId] = `Failed to fetch media item: ${
          mediaError?.message || 'Not found'
        }`;
        continue;
      }

      // Get the processing state
      const { data: processingState, error: stateError } = await supabase
        .from('processing_states')
        .select('*')
        .eq('media_item_id', mediaId)
        .eq('type', 'thumbnail')
        .maybeSingle();

      // Case 1: Missing processing state but has thumbnail
      if ((!processingState || stateError) && mediaItem.thumbnail_path) {
        // Create a success processing state
        const { error: insertError } = await supabase
          .from('processing_states')
          .upsert({
            media_item_id: mediaId,
            type: 'thumbnail',
            status: 'complete',
            updated_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            error_message: 'Added by automatic repair',
          });

        results[mediaId] = insertError
          ? `Failed to create processing state: ${insertError.message}`
          : 'Created missing success processing state';
        continue;
      }

      // Case 2: Has success state but no thumbnail path
      if (
        processingState &&
        processingState.status === 'complete' &&
        !mediaItem.thumbnail_path
      ) {
        // Update to failure state
        const { error: updateStateError } = await supabase
          .from('processing_states')
          .update({
            status: 'failure',
            error_message:
              'Marked as failure by automatic repair - no thumbnail path found',
            updated_at: new Date().toISOString(),
          })
          .eq('media_item_id', mediaId)
          .eq('type', 'thumbnail');

        results[mediaId] = updateStateError
          ? `Failed to update processing state: ${updateStateError.message}`
          : 'Updated inconsistent success state to failure';
        continue;
      }

      // Case 3: Has failure state but has thumbnail path
      if (
        processingState &&
        processingState.status === 'failure' &&
        mediaItem.thumbnail_path
      ) {
        // Check if thumbnail actually exists in storage
        try {
          const filename = path.basename(mediaItem.thumbnail_path);
          const { data: files, error: fileError } = await supabase.storage
            .from('thumbnails')
            .list('', {
              limit: 1,
              search: filename,
            });

          if (!fileError && files && files.length > 0) {
            // File exists, update to success state
            const { error: updateStateError } = await supabase
              .from('processing_states')
              .update({
                status: 'complete',
                error_message: 'Fixed by automatic repair - thumbnail found',
                updated_at: new Date().toISOString(),
              })
              .eq('media_item_id', mediaId)
              .eq('type', 'thumbnail');

            results[mediaId] = updateStateError
              ? `Failed to update processing state: ${updateStateError.message}`
              : 'Updated inconsistent failure state to success';
          } else {
            // File doesn't exist, clear the path
            const { error: updateMediaError } = await supabase
              .from('media_items')
              .update({
                thumbnail_path: null,
              })
              .eq('id', mediaId);

            results[mediaId] = updateMediaError
              ? `Failed to clear thumbnail path: ${updateMediaError.message}`
              : 'Cleared invalid thumbnail path';
          }
        } catch (error) {
          results[mediaId] = `Failed to check thumbnail: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      }
    }

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      results: {
        error: `Operation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
    };
  }
}

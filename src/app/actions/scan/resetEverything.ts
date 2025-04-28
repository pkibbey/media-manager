'use server';

import { deleteAllMediaItems } from '../exif/delete-all-media-items';
import { deleteAllFileTypes } from '../file-types/delete-all-file-types';
import { deleteAllProcessingStates } from '../processing/delete-all-processing-states';

/**
 * Reset the processing state of all media items
 * This will mark all items as unprocessed so they can be re-processed
 */
export async function resetEverything(): Promise<{
  message?: string;
  error?: string;
}> {
  // Delete all processing states - must be done befree deleting media items
  const processingStatesResult = await deleteAllProcessingStates();

  // Delete all media items
  const mediaItemsResult = await deleteAllMediaItems();

  // Delete all file types
  const fileTypesResult = await deleteAllFileTypes();

  const hasErrors = Boolean(
    processingStatesResult.error ||
      mediaItemsResult.error ||
      fileTypesResult.error,
  );

  if (hasErrors) {
    return {
      error:
        processingStatesResult.error?.message ||
        mediaItemsResult.error?.message ||
        fileTypesResult.error?.message,
      message: 'Failed to reset all media items.',
    };
  }

  return {
    message: `Successfully reset ${mediaItemsResult.count} media items to unprocessed state.`,
  };
}

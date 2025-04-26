'use server';
import { revalidatePath } from 'next/cache';
import {
  deleteAllFileTypes,
  deleteAllMediaItems,
  deleteAllProcessingStates,
} from '@/lib/query-helpers';

/**
 * Reset the processing state of all media items
 * This will mark all items as unprocessed so they can be re-processed
 */
export async function resetEverything(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  // Delete all processing states - must be done befree deleting media items
  const processingStatesResult = await deleteAllProcessingStates();

  if (!processingStatesResult.success) {
    console.error(
      'RESET: Error deleting processing states:',
      processingStatesResult.error,
    );
    return { success: false, error: processingStatesResult.error };
  }

  // Delete all media items
  const mediaItemsResult = await deleteAllMediaItems();

  if (!mediaItemsResult.success) {
    console.error('RESET: Error deleting media items:', mediaItemsResult.error);
    return { success: false, error: mediaItemsResult.error };
  }

  // Delete all file types
  const fileTypesResult = await deleteAllFileTypes();

  if (!fileTypesResult.success) {
    console.error('RESET: Error deleting file types:', fileTypesResult.error);
    return { success: false, error: fileTypesResult.error };
  }

  revalidatePath('/admin');

  return {
    success: true,
    message: `Successfully reset ${mediaItemsResult.count} media items to unprocessed state.`,
  };
}

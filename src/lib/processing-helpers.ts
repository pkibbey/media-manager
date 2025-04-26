import type { ProcessingStatus } from '@/types/progress-types';
import { updateProcessingState } from './query-helpers';

/**
 * Handle an error during processing by updating the processing state
 * and returning a result object
 */
export async function handleProcessingError({
  mediaItemId,
  type,
  error,
}: {
  mediaItemId: string;
  type: string;
  error: unknown;
}) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  try {
    await updateProcessingState({
      media_item_id: mediaItemId,
      status: 'failure',
      type,
      error_message: errorMessage,
    });
  } catch (updateError) {
    console.error(
      `Failed to update processing state to 'failure':`,
      updateError,
    );
  }

  return {
    success: false,
    message: errorMessage,
  };
}

/**
 * Generic helper function to update processing state with consistent error handling
 */
async function updateProcessingStateWithErrorHandling({
  mediaItemId,
  type,
  status,
  message,
}: {
  mediaItemId: string;
  type: string;
  status: ProcessingStatus | null;
  message: string;
}): Promise<void> {
  // Skip if status is null (in progress)
  if (status === null) return;

  try {
    await updateProcessingState({
      media_item_id: mediaItemId,
      status,
      type,
      error_message: message,
    });
  } catch (error) {
    console.error(
      `Failed to update processing state for media item ${mediaItemId}:`,
      error,
    );
  }
}

/**
 * Mark a media item as having an error or failure during processing
 */
export async function markProcessingError({
  mediaItemId,
  type,
  error,
}: {
  mediaItemId: string;
  type: string;
  error: unknown;
}): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  await updateProcessingStateWithErrorHandling({
    mediaItemId,
    type,
    status: 'failure',
    message: errorMessage,
  });
}

/**
 * Mark a media item as successfully processed
 */
export async function markProcessingSuccess({
  mediaItemId,
  type,
  message = 'Processing completed successfully',
}: {
  mediaItemId: string;
  type: string;
  message?: string;
}): Promise<void> {
  await updateProcessingStateWithErrorHandling({
    mediaItemId,
    type,
    status: 'success',
    message,
  });
}

/**
 * Mark a media item as being processed
 * Note: For the simplified model, we use null to indicate "in progress"
 */
export async function markProcessingStarted({
  mediaItemId,
  type,
  message = 'Processing started',
}: {
  mediaItemId: string;
  type: string;
  message?: string;
}): Promise<void> {
  await updateProcessingStateWithErrorHandling({
    mediaItemId,
    type,
    status: null,
    message,
  });
}

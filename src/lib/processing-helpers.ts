import { updateProcessingState } from '@/app/actions/processing/update-processing-state';
import type { ProgressStatus } from '@/types/progress-types';

/**
 * Handle an error during processing by updating the processing state
 * and returning a result object
 */
export async function handleProcessingError({
  mediaItemId,
  type,
  errorMessage,
}: {
  mediaItemId: string;
  type: string;
  errorMessage: string;
}) {
  try {
    await updateProcessingState({
      mediaItemId,
      status: 'failure',
      type,
      errorMessage,
    });
  } catch (updateError) {
    console.error(
      `Failed to update processing state to 'failure':`,
      updateError,
    );
  }

  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * Generic helper function to update processing state with consistent error handling
 */
async function updateProcessingStateWithErrorHandling({
  mediaItemId,
  type,
  status,
  errorMessage,
}: {
  mediaItemId: string;
  type: string;
  status: ProgressStatus;
  errorMessage: string;
}): Promise<void> {
  // Skip if status is null (in progress)
  if (status === null) return;

  try {
    await updateProcessingState({
      mediaItemId,
      status,
      type,
      errorMessage,
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
  errorMessage,
}: {
  mediaItemId: string;
  type: string;
  errorMessage: string;
}): Promise<void> {
  await updateProcessingStateWithErrorHandling({
    mediaItemId,
    type,
    status: 'failure',
    errorMessage,
  });
}

/**
 * Mark a media item as successfully processed
 */
export async function markProcessingSuccess({
  mediaItemId,
  type,
  errorMessage = 'Processing completed successfully',
}: {
  mediaItemId: string;
  type: string;
  errorMessage?: string;
}): Promise<void> {
  await updateProcessingStateWithErrorHandling({
    mediaItemId,
    type,
    status: 'complete',
    errorMessage,
  });
}

/**
 * Mark a media item as being processed
 * Note: For the simplified model, we use null to indicate "in progress"
 */
export async function markProcessingStarted({
  mediaItemId,
  type,
  errorMessage = 'Processing started',
}: {
  mediaItemId: string;
  type: string;
  errorMessage?: string;
}): Promise<void> {
  await updateProcessingStateWithErrorHandling({
    mediaItemId,
    type,
    status: 'processing',
    errorMessage,
  });
}

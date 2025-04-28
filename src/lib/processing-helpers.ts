import { updateProcessingState } from '@/actions/processing/update-processing-state';
import type { ProgressStatus, UnifiedProgress } from '@/types/progress-types';

/**
 * Handle an error during processing by updating the processing state
 * and returning a result object
 */
export async function handleProcessingError({
  mediaItemId,
  progressType,
  errorMessage,
}: {
  mediaItemId: string;
  progressType: string;
  errorMessage: string;
}) {
  try {
    await updateProcessingState({
      mediaItemId,
      status: 'failure',
      progressType,
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
  progressType,
  status,
  errorMessage,
}: {
  mediaItemId: string;
  progressType: string;
  status: ProgressStatus;
  errorMessage: string;
}): Promise<void> {
  // Skip if status is null (in progress)
  if (status === null) return;

  try {
    await updateProcessingState({
      mediaItemId,
      status,
      progressType,
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
  progressType,
  errorMessage,
}: {
  mediaItemId: string;
  progressType: string;
  errorMessage: string;
}): Promise<void> {
  await updateProcessingStateWithErrorHandling({
    mediaItemId,
    progressType,
    status: 'failure',
    errorMessage,
  });
}

/**
 * Mark a media item as successfully processed
 */
export async function markProcessingSuccess({
  mediaItemId,
  progressType,
  errorMessage = 'Processing completed successfully',
}: {
  mediaItemId: string;
  progressType: string;
  errorMessage?: string;
}): Promise<void> {
  await updateProcessingStateWithErrorHandling({
    mediaItemId,
    progressType,
    status: 'complete',
    errorMessage,
  });
}

/**
 * Mark a media item as being processed
 * Note: Status is set to "processing" to indicate item is currently being processed
 */
export async function markProcessingStarted({
  mediaItemId,
  progressType,
  errorMessage = 'Processing started',
}: {
  mediaItemId: string;
  progressType: string;
  errorMessage?: string;
}): Promise<void> {
  await updateProcessingStateWithErrorHandling({
    mediaItemId,
    progressType,
    status: 'processing',
    errorMessage,
  });
}

/**
 * Sends a progress update through a stream writer using the UnifiedProgress type.
 */
export async function sendProgress(
  encoder: TextEncoder,
  writer: WritableStreamDefaultWriter,
  progress: Partial<UnifiedProgress>,
) {
  // Ensure timestamp is set
  if (!progress.timestamp) {
    progress.timestamp = Date.now();
  }

  await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
}

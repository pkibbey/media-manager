import { updateProcessingState } from './query-helpers';

/**
 * Handle an error during processing by updating the processing state
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
      status: 'error',
      type,
      error_message: errorMessage,
    });
  } catch (updateError) {
    console.error(`Failed to update processing state to 'error':`, updateError);
  }

  return {
    success: false,
    message: errorMessage,
  };
}

/**
 * Mark a media item as having an error during processing
 * This is similar to handleProcessingError but doesn't return a result object
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

  try {
    await updateProcessingState({
      media_item_id: mediaItemId,
      status: 'error',
      type,
      error_message: errorMessage,
    });
  } catch (updateError) {
    console.error(`Failed to update processing state to 'error':`, updateError);
  }
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
  try {
    await updateProcessingState({
      media_item_id: mediaItemId,
      status: 'success',
      type,
      error_message: message,
    });
  } catch (error) {
    console.error(`Failed to update processing state to 'success':`, error);
  }
}

/**
 * Mark a media item as skipped during processing
 */
export async function markProcessingSkipped({
  mediaItemId,
  type,
  reason,
}: {
  mediaItemId: string;
  type: string;
  reason: string;
}): Promise<void> {
  try {
    await updateProcessingState({
      media_item_id: mediaItemId,
      status: 'skipped',
      type,
      error_message: reason,
    });
  } catch (error) {
    console.error(`Failed to update processing state to 'skipped':`, error);
  }
}

/**
 * Mark a media item as aborted during processing
 */
export async function markProcessingAborted({
  mediaItemId,
  type,
  reason = 'Processing aborted by user',
}: {
  mediaItemId: string;
  type: string;
  reason?: string;
}): Promise<void> {
  try {
    await updateProcessingState({
      media_item_id: mediaItemId,
      status: 'aborted',
      type,
      error_message: reason,
    });
  } catch (error) {
    console.error(`Failed to update processing state to 'aborted':`, error);
  }
}

/**
 * Mark a media item as failed during processing
 */
export async function markProcessingFailed({
  mediaItemId,
  type,
  reason,
}: {
  mediaItemId: string;
  type: string;
  reason: string;
}): Promise<void> {
  try {
    await updateProcessingState({
      media_item_id: mediaItemId,
      status: 'failed',
      type,
      error_message: reason,
    });
  } catch (error) {
    console.error(`Failed to update processing state to 'failed':`, error);
  }
}

/**
 * Mark a media item as being processed
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
  try {
    await updateProcessingState({
      media_item_id: mediaItemId,
      status: 'processing',
      type,
      error_message: message,
    });
  } catch (error) {
    console.error(`Failed to update processing state to 'processing':`, error);
  }
}

import { createServerSupabaseClient } from './supabase';

/**
 * Update a processing state entry for a media item
 */
export async function updateProcessingState({
  mediaItemId,
  type,
  status,
  errorMessage = null,
}: {
  mediaItemId: string;
  type: string;
  status:
    | 'success'
    | 'error'
    | 'skipped'
    | 'pending'
    | 'outdated'
    | 'unsupported';
  errorMessage?: string | null;
}) {
  const supabase = createServerSupabaseClient();

  return await supabase.from('processing_states').upsert({
    media_item_id: mediaItemId,
    type,
    status,
    processed_at: new Date().toISOString(),
    error_message: errorMessage,
  });
}

/**
 * Check for large files and mark them as skipped if necessary
 * Returns true if file was skipped, false otherwise
 */
export async function handleLargeFile({
  mediaId,
  size,
  type,
  threshold,
}: {
  mediaId: string;
  filePath: string;
  fileName: string;
  size: number;
  type: string;
  threshold: number;
}): Promise<boolean> {
  if (size > threshold) {
    // File is too large, mark as skipped
    await updateProcessingState({
      mediaItemId: mediaId,
      type,
      status: 'skipped',
      errorMessage: `Large file (over ${Math.round(size / (1024 * 1024))}MB)`,
    });

    return true; // File was skipped
  }

  return false; // File was not skipped
}

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
      mediaItemId,
      type,
      status: 'error',
      errorMessage,
    });
  } catch (updateError) {
    console.error(`Failed to update processing state to 'error':`, updateError);
  }

  return {
    success: false,
    message: errorMessage,
  };
}

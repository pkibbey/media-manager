import type { ExifProgress } from '@/types/exif';
import { createServerSupabaseClient } from './supabase';

/**
 * Update a processing state entry for a media item
 */
export async function updateProcessingState({
  mediaItemId,
  type,
  status,
  errorMessage = null,
  metadata = null,
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
  metadata?: Record<string, any> | null;
}) {
  const supabase = createServerSupabaseClient();

  return await supabase.from('processing_states').upsert({
    media_item_id: mediaItemId,
    type,
    status,
    processed_at: new Date().toISOString(),
    error_message: errorMessage,
    metadata,
  });
}

/**
 * Send a progress update through a writer stream
 */
export async function sendProgress(
  writer: WritableStreamDefaultWriter,
  progress: ExifProgress,
  encoder: TextEncoder,
) {
  await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
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
  metadata = null,
}: {
  mediaId: string;
  filePath: string;
  fileName: string;
  size: number;
  type: string;
  threshold: number;
  metadata?: Record<string, any> | null;
}): Promise<boolean> {
  if (size > threshold) {
    // File is too large, mark as skipped
    await updateProcessingState({
      mediaItemId: mediaId,
      type,
      status: 'skipped',
      errorMessage: `Large file (over ${Math.round(size / (1024 * 1024))}MB)`,
      metadata,
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
  metadata = null,
}: {
  mediaItemId: string;
  type: string;
  error: unknown;
  metadata?: Record<string, any> | null;
}) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  try {
    await updateProcessingState({
      mediaItemId,
      type,
      status: 'error',
      errorMessage,
      metadata,
    });
  } catch (updateError) {
    console.error(`Failed to update processing state to 'error':`, updateError);
  }

  return {
    success: false,
    message: errorMessage,
  };
}

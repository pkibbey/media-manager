import { updateProcessingState } from '@/actions/processing/update-processing-state';
import type { UnifiedProgress } from '@/types/progress-types';

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
  await updateProcessingState({
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
  await updateProcessingState({
    mediaItemId,
    progressType,
    status: 'complete',
    errorMessage,
  });
}

/**
 * Sends a progress update through a stream writer using the UnifiedProgress type.
 */
export async function sendStreamProgress(
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

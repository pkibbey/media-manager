'use server';

import type { ProcessingStatus, UnifiedProgress } from '@/types/progress-types';

/**
 * Sends a progress update through a stream writer using the UnifiedProgress type.
 * Calculates percentComplete automatically if totalCount and processedCount are provided.
 */
export async function sendProgress(
  encoder: TextEncoder,
  writer: WritableStreamDefaultWriter,
  progress: Partial<UnifiedProgress> & { message: string },
) {
  // Calculate percentage if not provided but counts are available
  if (
    progress.percentComplete === undefined &&
    progress.totalCount !== undefined &&
    progress.processedCount !== undefined &&
    progress.totalCount > 0
  ) {
    progress.percentComplete = Math.min(
      100,
      Math.floor((progress.processedCount / progress.totalCount) * 100),
    );
  }

  // Ensure timestamp is set
  if (!progress.timestamp) {
    progress.timestamp = Date.now();
  }

  // For backward compatibility - map status to stage if status is provided but stage isn't
  if (progress.status && !progress.stage) {
    // Map the new status values to old stage values
    const statusToStage: Record<string, ProcessingStatus> = {
      processing: 'processing',
      batch_complete: 'batch_complete',
      complete: 'complete',
      failure: 'failure',
      success: 'started',
    };

    progress.stage = statusToStage[progress.status] || 'processing';
  }

  await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
}

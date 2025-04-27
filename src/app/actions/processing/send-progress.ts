'use server';

import type { UnifiedProgress } from '@/types/progress-types';

/**
 * Sends a progress update through a stream writer using the UnifiedProgress type.
 * Calculates percentComplete automatically if totalCount and processedCount are provided.
 */
export async function sendProgress(
  encoder: TextEncoder,
  writer: WritableStreamDefaultWriter,
  progress: Partial<UnifiedProgress>,
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

  await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
}

'use server';

/**
 * Abort thumbnail generation process
 *
 * This is now a placeholder function since we handle cancellation
 * directly through AbortController on the client side.
 * The streamUnprocessedThumbnails function now detects when the client
 * cancels the stream and terminates processing.
 */
export async function abortThumbnailGeneration(): Promise<{
  success: boolean;
  message: string;
}> {
  return {
    success: true,
    message: 'Thumbnail generation cancelled',
  };
}

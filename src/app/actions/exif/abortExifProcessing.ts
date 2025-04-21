'use server';

/**
 * Abort EXIF processing
 *
 * This is now a placeholder function since we handle cancellation
 * directly through AbortController on the client side.
 * The streamProcessUnprocessedItems function now detects when the client
 * cancels the stream and terminates processing.
 */
export async function abortExifProcessing(): Promise<{
  success: boolean;
  message: string;
}> {
  return {
    success: true,
    message: 'Processing aborted successfully',
  };
}

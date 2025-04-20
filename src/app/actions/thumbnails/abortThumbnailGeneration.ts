'use server';

import { addAbortToken, isAborted } from '@/lib/abort-tokens';

/**
 * Abort thumbnail generation process
 */
export async function abortThumbnailGeneration(token: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Check if the token exists
    const isActive = await isAborted(token);

    if (isActive) {
      return {
        success: true,
        message: 'Cancellation already in progress',
      };
    }

    // Add the token to the abort list
    await addAbortToken(token);

    return {
      success: true,
      message: 'Thumbnail generation cancelled',
    };
  } catch (error: any) {
    console.error('Error aborting thumbnail generation:', error);
    return {
      success: false,
      message: `Failed to abort: ${error.message}`,
    };
  }
}

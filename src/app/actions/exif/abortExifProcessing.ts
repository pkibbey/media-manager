'use server';

import { addAbortToken } from '@/lib/abort-tokens';

/**
 * Abort EXIF processing by token
 */
export async function abortExifProcessing(token: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await addAbortToken(token);
    return {
      success: true,
      message: 'Processing aborted successfully',
    };
  } catch (error: any) {
    console.error('Error aborting EXIF processing:', error);
    return {
      success: false,
      message: `Error aborting processing: ${error.message || 'Unknown error'}`,
    };
  }
}

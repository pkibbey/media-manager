'use server';

import {
  addAbortToken,
  clearAbortTokens,
  removeAbortToken,
} from '@/lib/abort-tokens';

/**
 * Abort thumbnail generation process
 */
export async function abortThumbnailGeneration(token: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Special case: 'cleanup-all' will remove all abort tokens
    if (token === 'cleanup-all') {
      await clearAbortTokens();
      return {
        success: true,
        message: 'All abort tokens cleared',
      };
    }

    // Check if it's a cleanup request for a specific token
    if (token.startsWith('cleanup-')) {
      const actualToken = token.replace('cleanup-', '');
      await removeAbortToken(actualToken);
      return {
        success: true,
        message: `Token ${actualToken} removed`,
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

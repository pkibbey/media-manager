'use server';

import { serverEnv } from 'shared/env';

/**
 * Get media scan paths from environment variables
 * This is a server action to avoid exposing environment variables to the client
 */
export async function getMediaScanPaths(): Promise<string> {
  return serverEnv.MEDIA_SCAN_PATHS;
}

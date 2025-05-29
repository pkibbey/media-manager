'use server';

import { addScanFolderJob } from '@/actions/queue/queue-service';

/**
 * Queue a folder scan job
 */
export async function queueScanFolder(folderPath: string) {
  try {
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Invalid folder path provided');
    }

    const result = await addScanFolderJob(folderPath);

    return {
      success: true,
      jobId: result.jobId,
      message: 'Folder scan job queued successfully',
    };
  } catch (error) {
    console.error('Error queueing folder scan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to queue folder scan job',
    };
  }
}

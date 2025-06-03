'use server';

import { type QueueStats, getQueueStats } from '../queue/get-queue-stats';

export interface ExifQueueStats extends QueueStats {
  // Override activeJobs to be more specific for EXIF jobs
  activeJobs?: Array<{
    id: string;
    data: {
      id: string;
      media_path: string;
      media_types?: {
        is_ignored: boolean;
      };
    };
    progress?: number;
  }>;
}

export async function getExifQueueStats(): Promise<ExifQueueStats> {
  return getQueueStats('exifQueue') as Promise<ExifQueueStats>;
}

import { Queue } from 'bullmq';
import { redis } from './redis';

// Queue names
export const QUEUE_NAMES = {
  SCAN_FOLDER: 'scan-folder',
  THUMBNAILS: 'thumbnails',
  EXIF: 'exif',
  BASIC_ANALYSIS: 'basic-analysis',
  ADVANCED_ANALYSIS: 'advanced-analysis',
  CONTENT_WARNINGS: 'content-warnings',
} as const;

// Job types
export interface ScanFolderJobData {
  folderPath: string;
}

export interface ThumbnailJobData {
  limit: number;
  concurrency: number;
}

export interface ExifJobData {
  limit: number;
  concurrency: number;
}

export interface BasicAnalysisJobData {
  limit: number;
}

export interface AdvancedAnalysisJobData {
  limit: number;
  concurrency: number;
}

export interface ContentWarningsJobData {
  limit: number;
  concurrency: number;
}

// Create queues
export const scanFolderQueue = new Queue<ScanFolderJobData>(
  QUEUE_NAMES.SCAN_FOLDER,
  {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },
);

export const thumbnailQueue = new Queue<ThumbnailJobData>(
  QUEUE_NAMES.THUMBNAILS,
  {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  },
);

export const exifQueue = new Queue<ExifJobData>(QUEUE_NAMES.EXIF, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const basicAnalysisQueue = new Queue<BasicAnalysisJobData>(
  QUEUE_NAMES.BASIC_ANALYSIS,
  {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  },
);

export const advancedAnalysisQueue = new Queue<AdvancedAnalysisJobData>(
  QUEUE_NAMES.ADVANCED_ANALYSIS,
  {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },
);

export const contentWarningsQueue = new Queue<ContentWarningsJobData>(
  QUEUE_NAMES.CONTENT_WARNINGS,
  {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  },
);

export const queues = {
  [QUEUE_NAMES.SCAN_FOLDER]: scanFolderQueue,
  [QUEUE_NAMES.THUMBNAILS]: thumbnailQueue,
  [QUEUE_NAMES.EXIF]: exifQueue,
  [QUEUE_NAMES.BASIC_ANALYSIS]: basicAnalysisQueue,
  [QUEUE_NAMES.ADVANCED_ANALYSIS]: advancedAnalysisQueue,
  [QUEUE_NAMES.CONTENT_WARNINGS]: contentWarningsQueue,
};

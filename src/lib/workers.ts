import { Worker } from 'bullmq';
import {
  processAdvancedAnalysisJob,
  processBasicAnalysisJob,
  processContentWarningsJob,
  processExifJob,
  processScanFolderJob,
  processThumbnailJob,
} from './job-processors';
import { QUEUE_NAMES } from './queues';
import { redis } from './redis';

// Create workers
export const scanFolderWorker = new Worker(
  QUEUE_NAMES.SCAN_FOLDER,
  processScanFolderJob,
  {
    connection: redis,
    concurrency: 1, // Only one folder scan at a time
  },
);

export const thumbnailWorker = new Worker(
  QUEUE_NAMES.THUMBNAILS,
  processThumbnailJob,
  {
    connection: redis,
    concurrency: 2, // Allow 2 concurrent thumbnail jobs
  },
);

export const exifWorker = new Worker(QUEUE_NAMES.EXIF, processExifJob, {
  connection: redis,
  concurrency: 3, // Allow 3 concurrent EXIF jobs
});

export const basicAnalysisWorker = new Worker(
  QUEUE_NAMES.BASIC_ANALYSIS,
  processBasicAnalysisJob,
  {
    connection: redis,
    concurrency: 2, // CPU intensive, limit concurrency
  },
);

export const advancedAnalysisWorker = new Worker(
  QUEUE_NAMES.ADVANCED_ANALYSIS,
  processAdvancedAnalysisJob,
  {
    connection: redis,
    concurrency: 1, // Very CPU intensive, one at a time
  },
);

export const contentWarningsWorker = new Worker(
  QUEUE_NAMES.CONTENT_WARNINGS,
  processContentWarningsJob,
  {
    connection: redis,
    concurrency: 2, // Moderate concurrency
  },
);

// Error handling
const workers = [
  scanFolderWorker,
  thumbnailWorker,
  exifWorker,
  basicAnalysisWorker,
  advancedAnalysisWorker,
  contentWarningsWorker,
];

workers.forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} in queue ${worker.name} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} in queue ${worker.name} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error(`Worker error in ${worker.name}:`, err);
  });
});

export { workers };

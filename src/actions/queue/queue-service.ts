'use server';

import {
  advancedAnalysisQueue,
  basicAnalysisQueue,
  contentWarningsQueue,
  exifQueue,
  queues,
  scanFolderQueue,
  thumbnailQueue,
} from '@/lib/queues';

// Add jobs to queues
export async function addScanFolderJob(folderPath: string) {
  const job = await scanFolderQueue.add('scan-folder', { folderPath });
  return { jobId: job.id };
}

export async function addThumbnailJob(limit = 10, concurrency = 3) {
  const job = await thumbnailQueue.add('process-thumbnails', {
    limit,
    concurrency,
  });
  return { jobId: job.id };
}

export async function addExifJob(limit = 10, concurrency = 3) {
  const job = await exifQueue.add('process-exif', { limit, concurrency });
  return { jobId: job.id };
}

export async function addBasicAnalysisJob(limit = 10) {
  const job = await basicAnalysisQueue.add('process-basic-analysis', { limit });
  return { jobId: job.id };
}

export async function addAdvancedAnalysisJob(limit = 10, concurrency = 3) {
  const job = await advancedAnalysisQueue.add('process-advanced-analysis', {
    limit,
    concurrency,
  });
  return { jobId: job.id };
}

export async function addContentWarningsJob(limit = 10, concurrency = 3) {
  const job = await contentWarningsQueue.add('process-content-warnings', {
    limit,
    concurrency,
  });
  return { jobId: job.id };
}

// Get job status
export async function getJobStatus(queueName: string, jobId: string) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return { status: 'not_found' };
  }

  const state = await job.getState();
  return {
    id: job.id,
    status: state,
    progress: job.progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

// Get queue stats
export async function getQueueStats(queueName: string) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const waiting = await queue.getWaiting();
  const active = await queue.getActive();
  const completed = await queue.getCompleted();
  const failed = await queue.getFailed();

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  };
}

// Get all queue stats
export async function getAllQueueStats() {
  const stats: Record<
    string,
    { waiting: number; active: number; completed: number; failed: number }
  > = {};

  for (const [name] of Object.entries(queues)) {
    const queueStats = await getQueueStats(name);
    stats[name] = queueStats;
  }

  return stats;
}

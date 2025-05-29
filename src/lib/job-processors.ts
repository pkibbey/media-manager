import type { Job } from 'bullmq';
import { processScanFolder } from '@/actions/admin/process-scan-folder';
import { processAdvancedAnalysis } from '@/actions/analysis/process-advanced-analysis';
import { processBasicAnalysis } from '@/actions/analysis/process-basic-analysis';
import { processContentWarnings } from '@/actions/analysis/process-content-warnings';
import { processBatchExif } from '@/actions/exif/process-batch-exif';
import { processBatchThumbnails } from '@/actions/thumbnails/process-thumbnails';
import type {
  AdvancedAnalysisJobData,
  BasicAnalysisJobData,
  ContentWarningsJobData,
  ExifJobData,
  ScanFolderJobData,
  ThumbnailJobData,
} from './queues';

export const processScanFolderJob = async (job: Job<ScanFolderJobData>) => {
  const { folderPath } = job.data;

  // Update job progress
  await job.updateProgress(0);

  try {
    const result = await processScanFolder(folderPath);

    await job.updateProgress(100);

    return {
      success: result.success,
      processed: result.processed,
      skipped: result.skipped,
      total: result.total,
      directories: result.directories,
    };
  } catch (error) {
    throw new Error(
      `Scan folder job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const processThumbnailJob = async (job: Job<ThumbnailJobData>) => {
  const { limit, concurrency } = job.data;

  await job.updateProgress(0);

  try {
    const result = await processBatchThumbnails(limit, concurrency);

    await job.updateProgress(100);

    return result;
  } catch (error) {
    throw new Error(
      `Thumbnail job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const processExifJob = async (job: Job<ExifJobData>) => {
  const { limit, concurrency } = job.data;

  await job.updateProgress(0);

  try {
    const result = await processBatchExif(limit, concurrency);

    await job.updateProgress(100);

    return result;
  } catch (error) {
    throw new Error(
      `EXIF job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const processBasicAnalysisJob = async (
  job: Job<BasicAnalysisJobData>,
) => {
  const { limit } = job.data;

  await job.updateProgress(0);

  try {
    const result = await processBasicAnalysis(limit);

    await job.updateProgress(100);

    return result;
  } catch (error) {
    throw new Error(
      `Basic analysis job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const processAdvancedAnalysisJob = async (
  job: Job<AdvancedAnalysisJobData>,
) => {
  const { limit, concurrency } = job.data;

  await job.updateProgress(0);

  try {
    const result = await processAdvancedAnalysis(limit, concurrency);

    await job.updateProgress(100);

    return result;
  } catch (error) {
    throw new Error(
      `Advanced analysis job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const processContentWarningsJob = async (
  job: Job<ContentWarningsJobData>,
) => {
  const { limit, concurrency } = job.data;

  await job.updateProgress(0);

  try {
    const result = await processContentWarnings(limit, concurrency);

    await job.updateProgress(100);

    return result;
  } catch (error) {
    throw new Error(
      `Content warnings job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

import 'dotenv/config.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env.local' });

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { type Job, Queue, Worker } from 'bullmq';

import { fileTypeFromFile } from 'file-type';
import IORedis from 'ioredis';
import { createSupabase } from 'shared/supabase';
import type { FileDetails } from 'shared/types';

interface FolderScanJobData {
  folderPath: string;
}

const redisConnection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
  {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  },
);

const QUEUE_NAME = 'folderScanQueue';

// Initialize Supabase client once
const supabase = createSupabase();

// Initialize queue for adding subdirectories
const folderScanQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

// Helper function to get or create media type
async function getOrCreateMediaType(mimeType: string): Promise<string | null> {
  try {
    // First, try to find existing media type
    const { data: existingType, error: selectError } = await supabase
      .from('media_types')
      .select('id')
      .eq('mime_type', mimeType)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error finding media type:', selectError);
      return null;
    }

    if (existingType) {
      return existingType.id;
    }

    // If not found, create new media type
    const { data: newType, error: insertError } = await supabase
      .from('media_types')
      .insert([{ mime_type: mimeType }])
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating media type:', insertError);
      return null;
    }

    return newType.id;
  } catch (error) {
    console.error('Error in getOrCreateMediaType:', error);
    return null;
  }
}

// Helper function to check if files already exist in database
async function checkFilesExistInDatabase(
  mediaPaths: string[],
): Promise<Set<string>> {
  if (!mediaPaths || mediaPaths.length === 0) {
    return new Set();
  }

  const existingPaths = new Set<string>();

  // Process in small batches to avoid URI too long errors
  const BATCH_SIZE = 500;

  for (let i = 0; i < mediaPaths.length; i += BATCH_SIZE) {
    const batch = mediaPaths.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('media')
      .select('media_path')
      .in('media_path', batch);

    if (error) {
      console.error(`Error checking batch ${i}-${i + BATCH_SIZE}:`, error);
      continue;
    }

    if (data && data.length > 0) {
      data.forEach((item) => existingPaths.add(item.media_path));
    }
  }

  return existingPaths;
}

// Process scan results - add files to database
async function processScanResults(files: FileDetails[]) {
  let filesAdded = 0;
  let filesSkipped = 0;
  const errors: string[] = [];

  if (!files || files.length === 0) {
    return { filesAdded, filesSkipped, errors };
  }

  try {
    // Prepare media data for insertion
    const mediaData = files.map((file) => ({
      media_path: file.path,
      media_type_id: file.mediaType.id,
      size_bytes: file.size,
    }));

    // Insert files in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < mediaData.length; i += BATCH_SIZE) {
      const batch = mediaData.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('media')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`Error inserting batch ${i}-${i + BATCH_SIZE}:`, error);
        errors.push(`Batch ${i}: ${error.message}`);
        filesSkipped += batch.length;
      } else {
        filesAdded += data?.length || 0;
      }
    }
  } catch (error) {
    console.error('Error in processScanResults:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    filesSkipped = files.length;
  }

  return { filesAdded, filesSkipped, errors };
}

// Get files and directories from a folder
async function getFilesAndDirectories(folderPath: string): Promise<{
  files: FileDetails[];
  directories: string[];
}> {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const filesInDir = entries.filter((entry) => entry.isFile());
    const files: FileDetails[] = [];

    // Check which files already exist in database
    const mediaPaths = filesInDir.map((entry) =>
      path.join(folderPath, entry.name),
    );
    const existingFiles = await checkFilesExistInDatabase(mediaPaths);

    // Process each file
    for (const entry of filesInDir) {
      const fullPath = path.join(folderPath, entry.name);

      // Skip if file already exists in database
      if (existingFiles.has(fullPath)) {
        continue;
      }

      try {
        // Get file stats
        const stats = await fs.stat(fullPath);

        // Determine file type
        const fileType = await fileTypeFromFile(fullPath);
        const mimeType = fileType?.mime || 'application/octet-stream';

        // Get or create media type
        const mediaTypeId = await getOrCreateMediaType(mimeType);

        if (!mediaTypeId) {
          console.warn(
            `Could not determine media type for ${mimeType} - found ${entry.name}, skipping file`,
          );
          continue;
        }

        // Add file details to array
        files.push({
          path: fullPath,
          name: entry.name,
          size: stats.size,
          mediaType: {
            id: mediaTypeId,
            mime_type: mimeType,
          },
          lastModified: stats.mtimeMs,
        });
      } catch (err) {
        console.error(`Error processing file ${fullPath}:`, err);
      }
    }

    return { files, directories };
  } catch (error) {
    console.error(`Error reading directory ${folderPath}:`, error);
    return { files: [], directories: [] };
  }
}

/**
 * The main worker processor function.
 * This function is called for each job in the queue.
 */
const workerProcessor = async (
  job: Job<FolderScanJobData>,
): Promise<boolean> => {
  const { folderPath } = job.data;

  console.log(`[Worker] Processing folder scan for: ${folderPath}`);

  try {
    // Check if folder exists and is readable
    try {
      await fs.access(folderPath);
    } catch (_error) {
      throw new Error(`Cannot access folder at path: ${folderPath}`);
    }

    // Get files and subdirectories
    const { files, directories } = await getFilesAndDirectories(folderPath);

    // Process files if any found
    if (files.length > 0) {
      const results = await processScanResults(files);
      console.log(
        `[Worker] Processed ${results.filesAdded} files, skipped ${results.filesSkipped} files in ${folderPath}`,
      );

      if (results.errors.length > 0) {
        console.warn(`[Worker] Errors in ${folderPath}:`, results.errors);
      }
    }

    // Add subdirectories to queue for processing with randomized priority for cross-drive distribution
    if (directories.length > 0) {
      const subdirectoryJobs = directories.map((dirName) => ({
        name: 'folder-scan',
        data: {
          folderPath: path.join(folderPath, dirName),
        },
        opts: {
          // Random priority for discovered subdirectories (lower than initial folders)
          // This ensures good distribution across drives while processing depth-first within drives
          priority: Math.floor(Math.random() * 800) + 100, // Priority range: 100-899
        },
      }));

      await folderScanQueue.addBulk(subdirectoryJobs);
      console.log(
        `[Worker] Added ${directories.length} subdirectories to queue from ${folderPath}`,
      );
    }

    console.log(`[Worker] Successfully processed folder: ${folderPath}`);
    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Worker] Error processing job ${job.id} for folder ${folderPath}:`,
      errorMessage,
    );
    throw error; // Rethrow to allow BullMQ to handle retries/failures
  }
};

// Create and start the worker
const worker = new Worker<FolderScanJobData>(QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: Number.parseInt(
    process.env.FOLDER_SCAN_WORKER_CONCURRENCY || '5',
  ),
});

worker.on('completed', (job: Job<FolderScanJobData>) => {
  console.log(
    `[Worker] Job ${job.id} (Folder: ${job.data.folderPath}) completed folder scan.`,
  );
});

worker.on('failed', (job: Job<FolderScanJobData> | undefined, err: Error) => {
  console.error(
    `[Worker] Job ${job?.id} (Folder: ${job?.data.folderPath}) failed with error: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[Worker] Worker encountered an error:', err);
});

console.log(`Folder scan worker started. Listening to queue: ${QUEUE_NAME}`);

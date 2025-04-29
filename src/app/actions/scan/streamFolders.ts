'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { BATCH_SIZE } from '@/lib/consts';
import {
  getCategoryByExtension,
  getMimeTypeByExtension,
} from '@/lib/file-types-utils';
import {
  markProcessingError,
  markProcessingStarted,
  markProcessingSuccess,
  sendProgress,
} from '@/lib/processing-helpers';
import type { ProgressType } from '@/types/progress-types';
import type { UnifiedStats } from '@/types/unified-stats';
import { upsertFileType } from '../file-types/upsert-file-type';
import { insertMediaItem } from '../media/insert-media-item';
import { updateMediaItem } from '../media/update-media-item';
import { checkFileExists } from './check-file-exists';
import { getFoldersToScan } from './get-folders-to-scan';
import { getScanFileTypes } from './get-scan-file-types';
import { updateFolderLastScanned } from './update-folder-last-scanned';

interface ScanOptions {
  folderId?: number | null;
  batchSize?: number;
}

/**
 * Scan folders for media files and insert them into the database
 * This function uses a streaming approach to provide progress updates
 * @param options Optional scan options like ignoring small files and specifying a single folder ID to scan
 */
export async function streamFolders(options: ScanOptions = {}) {
  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start scanning in the background
  scanFoldersInternal(writer, options);

  // Set up a cleanup function on the stream
  const originalCancel = stream.readable.cancel;
  stream.readable.cancel = async (message) => {
    // Call the original cancel method
    return originalCancel?.call(stream.readable, message);
  };

  // Return the readable stream
  return stream.readable;
}

async function scanFoldersInternal(
  writer: WritableStreamDefaultWriter,
  options: ScanOptions,
) {
  const encoder = new TextEncoder();

  try {
    const { folderId = null } = options;

    // Single stats object to track all counters
    const counters: UnifiedStats['counts'] & {
      newFilesAdded: number;
      totalAvailable: number; // Renamed from 'discovered' to match other files
      processedCount: number;
      newFileTypes: Set<string>;
      currentBatch: number;
    } = {
      total: 0, // Will be set from the database query
      success: 0, // Successfully processed files
      failed: 0, // Failed files
      totalAvailable: 0, // Total files discovered (renamed from 'discovered')
      processedCount: 0, // Count of files actually processed
      newFilesAdded: 0, // New or updated files
      newFileTypes: new Set<string>(), // New file types found
      currentBatch: 1, // Current batch number
    };

    // Helper function to get common properties for progress messages
    function getCommonProperties() {
      return {
        totalCount: counters.totalAvailable,
        processedCount: counters.processedCount,
        successCount: counters.success, // Added to be consistent with other files
        failureCount: counters.failed, // Added to be consistent with other files
        progressType: 'scan' as ProgressType,
      };
    }

    // Get folders to scan - either a specific folder or all folders
    const { data: foldersToScan, error: foldersError } = await getFoldersToScan(
      folderId || undefined,
    );

    if (foldersError) {
      throw new Error(`Error getting folders to scan: ${foldersError.message}`);
    }

    if (!foldersToScan || foldersToScan.length === 0) {
      await sendProgress(encoder, writer, {
        status: 'complete', // Use consistent status approach
        message:
          'No folders configured for scanning. Add folders in admin panel.',
        ...getCommonProperties(),
      });
      return;
    }

    // Send initial progress update
    await sendProgress(encoder, writer, {
      status: 'processing', // Use consistent status approach
      message: `Starting scan of ${foldersToScan.length} folder(s)...`,
      ...getCommonProperties(),
    });

    // Get existing file types for reference
    const { data: existingFileTypes } = await getScanFileTypes();

    // Create a map of extension -> id for quick lookup
    const fileTypeMap = new Map<string, number>();
    existingFileTypes?.forEach((type) => {
      fileTypeMap.set(type.extension, type.id);
    });

    // Process each folder
    for (const folder of foldersToScan) {
      try {
        // Check if folder exists
        try {
          await fs.access(folder.path);
        } catch (accessError) {
          await sendProgress(encoder, writer, {
            status: 'failure',
            message: `Folder does not exist or is inaccessible. ${accessError}`,
            ...getCommonProperties(),
          });
          continue; // Skip to next folder
        }

        // Send update that we're starting to scan this folder
        await sendProgress(encoder, writer, {
          status: 'processing',
          message: `Scanning folder: ${folder.path}${folder.include_subfolders ? ' (including subfolders)' : ''}`,
          ...getCommonProperties(),
        });

        // Get all files in the folder (and optionally subfolders)
        const files = await getAllFiles(
          folder.path,
          folder.include_subfolders || false,
        );

        // Update discovered count and send update
        counters.totalAvailable += files.length;
        await sendProgress(encoder, writer, {
          status: 'processing',
          message: `Found ${files.length} files in ${folder.path}`,
          ...getCommonProperties(),
        });

        // Process files in batches to avoid timeout
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
          const batch = files.slice(i, i + BATCH_SIZE);

          // Send batch progress update
          if (i > 0) {
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: `Processing files ${i + 1} to ${Math.min(i + BATCH_SIZE, files.length)} of ${files.length} in ${folder.path}`,
              ...getCommonProperties(),
            });
          }

          for (const file of batch) {
            try {
              // Get file extension
              const fileExt = path.extname(file.path).slice(1).toLowerCase();

              // Skip if no extension
              if (!fileExt) {
                // Don't increment total counter here
                continue;
              }

              // Get file metadata
              const stats = await fs.stat(file.path);
              const fileName = path.basename(file.path);
              const fileMtime = stats.mtime;

              // Check if file already exists in database
              const { data: existingFile } = await checkFileExists(file.path);

              // Skip if file exists and hasn't changed
              if (
                existingFile?.modified_date &&
                new Date(existingFile.modified_date).getTime() ===
                  fileMtime.getTime() &&
                existingFile.size_bytes === stats.size
              ) {
                // Don't increment total counter here
                continue;
              }

              // Get or add file type ID
              let fileTypeId: number | null = fileTypeMap.get(fileExt) || null;

              // If file type not found in map, create it
              if (fileTypeId === null) {
                // New file type found
                counters.newFileTypes.add(fileExt);

                // Determine category and mime type automatically
                const category = getCategoryByExtension(fileExt);
                const mimeType = getMimeTypeByExtension(fileExt);

                // Add to database using upsert
                const { data: newType, error: typeError } =
                  await upsertFileType(fileExt, category, mimeType);

                if (!typeError && newType) {
                  fileTypeId = newType.id;
                  fileTypeMap.set(fileExt, newType.id);
                }
              }

              if (fileTypeId === null) {
                // If we couldn't get a file type ID, skip this file
                continue;
              }

              // Insert or update media item
              const fileData = {
                file_name: fileName,
                file_path: file.path,
                created_date: fileMtime.toISOString(),
                modified_date: fileMtime.toISOString(),
                size_bytes: stats.size,
                file_type_id: fileTypeId,
                folder_path: folder.path,
              };

              if (existingFile) {
                // Update existing file
                // Mark as processing
                await markProcessingStarted({
                  mediaItemId: existingFile.id,
                  progressType: 'scan',
                  errorMessage: `Updating file: ${fileName}`,
                });

                const { error: updateError } = await updateMediaItem(
                  existingFile.id,
                  fileData,
                );

                if (updateError) {
                  // Mark as error
                  await markProcessingError({
                    mediaItemId: existingFile.id,
                    progressType: 'scan',
                    errorMessage: `Failed to update file: ${updateError.message}`,
                  });
                } else {
                  // Mark as success
                  await markProcessingSuccess({
                    mediaItemId: existingFile.id,
                    progressType: 'scan',
                  });

                  counters.newFilesAdded++;
                }
              } else {
                // Insert new file
                const { data: insertedItem, error: insertError } =
                  await insertMediaItem(fileData);

                if (!insertError && insertedItem) {
                  counters.newFilesAdded++;

                  // Mark as success for new items
                  await markProcessingSuccess({
                    mediaItemId: insertedItem.id,
                    progressType: 'scan',
                    errorMessage: 'File added successfully',
                  });
                } else {
                  console.error(
                    `Failed to insert media item with no error: ${file.path}`,
                  );
                }
              }

              counters.processedCount++;

              // Send updates every 25 files or on last file
              if (
                counters.processedCount % 25 === 0 ||
                counters.processedCount === counters.totalAvailable
              ) {
                await sendProgress(encoder, writer, {
                  status: 'processing',
                  message: `Processed ${counters.processedCount} of ${counters.totalAvailable} files`,
                  ...getCommonProperties(),
                });
              }
            } catch (fileError: any) {
              console.error(`Error processing file: ${file.path}`, fileError);

              // If we have an existingFile ID, mark the error in processing_states
              const { data: existingFile } = await checkFileExists(file.path);
              if (existingFile?.id) {
                await markProcessingError({
                  mediaItemId: existingFile.id,
                  progressType: 'scan',
                  errorMessage: `Error processing file: ${fileError.message || 'Unknown error'}`,
                });
              }

              counters.processedCount++;
              counters.failed++;
            }
          }

          // At the end of each batch, if we have more batches to go
          if (i + BATCH_SIZE < files.length) {
            counters.currentBatch++;
            await sendProgress(encoder, writer, {
              status: 'batch_complete',
              message: `Finished batch ${counters.currentBatch - 1}. Continuing with next batch...`,
              ...getCommonProperties(),
            });
          }
        }

        // Update folder last_scanned timestamp
        await updateFolderLastScanned(folder.id);
      } catch (folderError: any) {
        console.error(`Error scanning folder ${folder.path}:`, folderError);
        await sendProgress(encoder, writer, {
          status: 'failure',
          message: `Error scanning folder: ${folder.path}`,
          ...getCommonProperties(),
        });
      }
    }

    // Send final progress update
    await sendProgress(encoder, writer, {
      status: 'complete',
      message: `Scan completed. Processed ${counters.processedCount} files, added ${counters.newFilesAdded} new/updated files.`,
      ...getCommonProperties(),
    });

    // Close the stream
    if (!writer.closed) {
      await writer.close();
    }
  } catch (error: any) {
    await sendProgress(encoder, writer, {
      status: 'failure',
      message: error?.message || 'Unknown error during scan',
      totalCount: 0,
      processedCount: 0,
      progressType: 'scan' as ProgressType,
    });
    if (!writer.closed) {
      await writer.close();
    }
  }
}

async function getAllFiles(
  dirPath: string,
  includeSubfolders: boolean,
): Promise<{ path: string }[]> {
  const files: { path: string }[] = [];

  // If we don't need to include subfolders, just scan the top directory
  if (!includeSubfolders) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(dirPath, entry.name);
          files.push({ path: fullPath });
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
    return files;
  }

  // For recursive scanning, use a queue-based approach to avoid stack overflow
  const directories: string[] = [dirPath];

  try {
    // Process directories in a queue to avoid deep recursion
    while (directories.length > 0) {
      const currentDir = directories.shift();
      if (!currentDir) continue;

      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Add to the queue instead of recursive call
          directories.push(fullPath);
        } else if (entry.isFile()) {
          files.push({ path: fullPath });
        }
      }
    }
  } catch (error) {
    console.error('Error during directory scanning:', error);
  }

  return files;
}

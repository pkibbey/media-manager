'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getCategoryByExtension,
  getMimeTypeByExtension,
} from '@/lib/file-types-utils';
import {
  checkFileExists,
  getFoldersToScan,
  getScanFileTypes,
  insertMediaItem,
  sendProgress,
  updateFolderLastScanned,
  updateMediaItem,
  upsertFileType,
} from '@/lib/query-helpers';
import { isAborted } from '@/lib/query-helpers';
import type { ScanOptions } from '@/types/progress-types';

/**
 * Scan folders for media files and insert them into the database
 * This function uses a streaming approach to provide progress updates
 * @param options Optional scan options like ignoring small files and specifying a single folder ID to scan
 */
export async function scanFolders(options: ScanOptions = {}) {
  const encoder = new TextEncoder();

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start scanning in the background
  scanFoldersInternal(writer, options);

  // Return the readable stream
  return stream.readable;

  async function scanFoldersInternal(
    writer: WritableStreamDefaultWriter,
    options: ScanOptions,
  ) {
    try {
      const { folderId = null, abortToken = null } = options;

      // Initialize counters
      let totalFilesDiscovered = 0;
      let totalFilesProcessed = 0;
      let totalFilesSkipped = 0;
      let newFilesAdded = 0;

      const newFileTypes = new Set<string>();

      // Get folders to scan - either a specific folder or all folders
      const { data: foldersToScan, error: foldersError } =
        await getFoldersToScan(folderId || undefined);

      if (foldersError) {
        throw new Error(
          `Error getting folders to scan: ${foldersError.message}`,
        );
      }

      if (!foldersToScan || foldersToScan.length === 0) {
        await sendProgress(encoder, writer, {
          status: 'completed',
          message:
            'No folders configured for scanning. Add folders in admin panel.',
          filesDiscovered: 0,
        });
        return;
      }

      // Send initial progress update
      await sendProgress(encoder, writer, {
        status: 'processing',
        message: `Starting scan of ${foldersToScan.length} folder(s)...`,
      });

      // Get existing file types for reference
      const { data: existingFileTypes } = await getScanFileTypes();

      // Create a map of extension -> category for quick lookup
      const fileTypeMap = new Map<string, string>();
      existingFileTypes?.forEach((type) => {
        fileTypeMap.set(type.extension, type.category);
      });

      // Process each folder
      for (const folder of foldersToScan) {
        try {
          // Check if the operation should be aborted
          if (abortToken && (await isAborted(abortToken))) {
            throw new Error('Scan aborted by user');
          }

          // Check if folder exists
          try {
            await fs.access(folder.path);
          } catch (accessError) {
            await sendProgress(encoder, writer, {
              status: 'error',
              message: `Cannot access folder: ${folder.path}`,
              error: `Folder does not exist or is inaccessible. ${accessError}`,
              folderPath: folder.path,
            });
            continue; // Skip to next folder
          }

          // Send update that we're starting to scan this folder
          await sendProgress(encoder, writer, {
            status: 'processing',
            message: `Scanning folder: ${folder.path}${folder.include_subfolders ? ' (including subfolders)' : ''}`,
            folderPath: folder.path,
          });

          // Get all files in the folder (and optionally subfolders)
          const files = await getAllFiles(
            folder.path,
            folder.include_subfolders || false,
          );

          // Update discovered count and send update
          totalFilesDiscovered += files.length;
          await sendProgress(encoder, writer, {
            status: 'processing',
            message: `Found ${files.length} files in ${folder.path}`,
            folderPath: folder.path,
            filesDiscovered: totalFilesDiscovered,
          });

          // Process files in batches to avoid timeout
          const BATCH_SIZE = 100;
          for (let i = 0; i < files.length; i += BATCH_SIZE) {
            // Check for abort signal
            if (abortToken && (await isAborted(abortToken))) {
              throw new Error('Scan aborted by user');
            }

            const batch = files.slice(i, i + BATCH_SIZE);

            // Send batch progress update
            if (i > 0) {
              await sendProgress(encoder, writer, {
                status: 'processing',
                message: `Processing files ${i + 1} to ${Math.min(i + BATCH_SIZE, files.length)} of ${files.length} in ${folder.path}`,
                folderPath: folder.path,
                filesDiscovered: totalFilesDiscovered,
                filesProcessed: totalFilesProcessed,
                newFilesAdded,
                filesSkipped: totalFilesSkipped,
              });
            }

            for (const file of batch) {
              try {
                // Get file extension
                const fileExt = path.extname(file.path).slice(1).toLowerCase();

                // Skip if no extension
                if (!fileExt) {
                  totalFilesProcessed++;
                  totalFilesSkipped++;
                  continue;
                }

                // Get file metadata
                const stats = await fs.stat(file.path);
                const fileName = path.basename(file.path);
                const fileMtime = stats.mtime;

                // Check if file already exists in database
                const { data: existingFile, error: existingError } =
                  await checkFileExists(file.path);

                if (existingError) {
                  console.error(
                    `Error checking if file exists: ${file.path}`,
                    existingError,
                  );
                }

                // Skip if file exists and hasn't changed
                if (
                  existingFile?.modified_date &&
                  new Date(existingFile.modified_date).getTime() ===
                    fileMtime.getTime() &&
                  existingFile.size_bytes === stats.size
                ) {
                  totalFilesProcessed++;
                  totalFilesSkipped++;
                  continue;
                }

                // Add or get file type in database
                let fileTypeId: number | null = null;

                // Check if we've seen this extension before
                if (!fileTypeMap.has(fileExt)) {
                  // New file type found
                  newFileTypes.add(fileExt);

                  // Determine category and mime type automatically
                  const category = getCategoryByExtension(fileExt);
                  const mimeType = getMimeTypeByExtension(fileExt);

                  // Add to database
                  const { data: newType, error: typeError } =
                    await upsertFileType(fileExt, category, mimeType);

                  if (typeError) {
                    console.error(
                      `Error adding file type: ${fileExt}`,
                      typeError,
                    );
                  } else if (newType) {
                    fileTypeId = newType.id;
                    fileTypeMap.set(fileExt, category);
                  }
                } else {
                  // Get file type ID
                  const { data: existingType, error: typeError } =
                    await getFileTypeIdByExtension(fileExt);

                  if (typeError) {
                    console.error(
                      `Error getting file type ID for ${fileExt}:`,
                      typeError,
                    );
                  } else if (existingType) {
                    fileTypeId = existingType.id;
                  }
                }

                if (fileTypeId === null) {
                  // If we couldn't get a file type ID, skip this file
                  totalFilesProcessed++;
                  totalFilesSkipped++;
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
                  const { error: updateError } = await updateMediaItem(
                    existingFile.id,
                    fileData,
                  );

                  if (updateError) {
                    console.error(
                      `Error updating media item: ${file.path}`,
                      updateError,
                    );
                  } else {
                    newFilesAdded++;
                  }
                } else {
                  // Insert new file
                  const { data: insertedItem, error: insertError } =
                    await insertMediaItem(fileData);

                  if (insertError) {
                    console.error(
                      `Error inserting media item: ${file.path}`,
                      insertError,
                    );
                  } else if (insertedItem) {
                    newFilesAdded++;
                  } else {
                    console.error(
                      `Failed to insert media item with no error: ${file.path}`,
                    );
                  }
                }

                totalFilesProcessed++;

                // Send updates every 25 files or on last file
                if (
                  totalFilesProcessed % 25 === 0 ||
                  totalFilesProcessed === totalFilesDiscovered
                ) {
                  await sendProgress(encoder, writer, {
                    status: 'processing',
                    message: `Processed ${totalFilesProcessed} of ${totalFilesDiscovered} files`,
                    folderPath: folder.path,
                    filesDiscovered: totalFilesDiscovered,
                    filesProcessed: totalFilesProcessed,
                    newFilesAdded,
                    filesSkipped: totalFilesSkipped,
                    newFileTypes: Array.from(newFileTypes),
                  });
                }
              } catch (fileError: any) {
                console.error(`Error processing file: ${file.path}`, fileError);
                totalFilesProcessed++;
              }
            }
          }

          // Update folder last_scanned timestamp
          await updateFolderLastScanned(folder.id);
        } catch (folderError: any) {
          console.error(`Error scanning folder ${folder.path}:`, folderError);
          await sendProgress(encoder, writer, {
            status: 'error',
            message: `Error scanning folder: ${folder.path}`,
            error: folderError.message,
            folderPath: folder.path,
          });
        }
      }

      // Send final progress update
      await sendProgress(encoder, writer, {
        status: 'completed',
        message: `Scan completed. Processed ${totalFilesProcessed} files, skipped ${totalFilesSkipped} unchanged files, added ${newFilesAdded} new/updated files.`,
        filesDiscovered: totalFilesDiscovered,
        filesProcessed: totalFilesProcessed,
        newFilesAdded,
        newFileTypes: Array.from(newFileTypes),
        filesSkipped: totalFilesSkipped,
      });

      // Close the stream
      await writer.close();
    } catch (error: any) {
      console.error('Error during scan:', error);
      await sendProgress(encoder, writer, {
        status: 'error',
        message: 'Error during scan',
        error: error.message,
      });
      await writer.close();
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
}

// Helper function to get file type ID by extension
async function getFileTypeIdByExtension(extension: string): Promise<{
  data: { id: number } | null;
  error: any | null;
}> {
  // Use the query helper function but handle it here to maintain consistent interface
  const { data: existingType, error } = await getScanFileTypes();

  if (error || !existingType) {
    return { data: null, error };
  }

  const fileType = existingType.find((ft) => ft.extension === extension);
  if (!fileType) {
    return { data: null, error: null };
  }

  // This would normally be returned from a direct query, but we're
  // extracting it from the file types we already have
  return {
    data: { id: Number.parseInt(fileType.extension) },
    error: null,
  };
}

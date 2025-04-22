'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ScanOptions, ScanProgress } from '@/types/progress-types';

// Size threshold for small files (10Kb)
const SMALL_FILE_THRESHOLD = 10 * 1024; // 10Kb in bytes

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
      const supabase = createServerSupabaseClient();
      const {
        ignoreSmallFiles = false,
        folderId = null,
        abortToken = null,
      } = options;

      // Initialize counters
      let totalFilesDiscovered = 0;
      let totalFilesProcessed = 0;
      let totalFilesSkipped = 0;
      let totalIgnoredFiles = 0;
      let totalSmallFilesSkipped = 0;
      let newFilesAdded = 0;

      const newFileTypes = new Set<string>();

      // Check for abort signal
      const abortController = abortToken ? new AbortController() : null;

      // Get folders to scan - either a specific folder or all folders
      const { data: foldersToScan, error: foldersError } = folderId
        ? await supabase
            .from('scan_folders')
            .select('*')
            .eq('id', folderId)
            .order('path')
        : await supabase.from('scan_folders').select('*').order('path');

      if (foldersError) {
        throw new Error(
          `Error getting folders to scan: ${foldersError.message}`,
        );
      }

      if (!foldersToScan || foldersToScan.length === 0) {
        await sendProgress(writer, {
          status: 'completed',
          message:
            'No folders configured for scanning. Add folders in admin panel.',
          filesDiscovered: 0,
        });
        return;
      }

      // Send initial progress update
      await sendProgress(writer, {
        status: 'processing',
        message: `Starting scan of ${foldersToScan.length} folder(s)...`,
      });

      // Get existing file types for reference
      const { data: existingFileTypes } = await supabase
        .from('file_types')
        .select('extension, category');

      // Create a map of extension -> category for quick lookup
      const fileTypeMap = new Map<string, string>();
      existingFileTypes?.forEach((type) => {
        fileTypeMap.set(type.extension, type.category);
      });

      // Process each folder
      for (const folder of foldersToScan) {
        try {
          // Check if folder exists
          try {
            await fs.access(folder.path);
          } catch (accessError) {
            await sendProgress(writer, {
              status: 'error',
              message: `Cannot access folder: ${folder.path}`,
              error: `Folder does not exist or is inaccessible. ${accessError}`,
              folderPath: folder.path,
            });
            continue; // Skip to next folder
          }

          // Send update that we're starting to scan this folder
          await sendProgress(writer, {
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
          await sendProgress(writer, {
            status: 'processing',
            message: `Found ${files.length} files in ${folder.path}`,
            folderPath: folder.path,
            filesDiscovered: totalFilesDiscovered,
          });

          // Process files in batches to avoid timeout
          const BATCH_SIZE = 100;
          for (let i = 0; i < files.length; i += BATCH_SIZE) {
            // Check for abort signal
            if (abortController?.signal.aborted) {
              throw new Error('Scan aborted by user');
            }

            const batch = files.slice(i, i + BATCH_SIZE);

            // Send batch progress update
            if (i > 0) {
              await sendProgress(writer, {
                status: 'processing',
                message: `Processing files ${i + 1} to ${Math.min(i + BATCH_SIZE, files.length)} of ${files.length} in ${folder.path}`,
                folderPath: folder.path,
                filesDiscovered: totalFilesDiscovered,
                filesProcessed: totalFilesProcessed,
                newFilesAdded,
                ignoredFilesSkipped: totalIgnoredFiles,
                smallFilesSkipped: totalSmallFilesSkipped,
              });
            }

            for (const file of batch) {
              try {
                // Check file size if ignoreSmallFiles is true
                if (ignoreSmallFiles) {
                  const stats = await fs.stat(file.path);

                  if (stats.size < SMALL_FILE_THRESHOLD) {
                    totalFilesProcessed++;
                    totalSmallFilesSkipped++;
                    continue; // Skip this file
                  }
                }

                // Get file extension
                const fileExt = path.extname(file.path).slice(1).toLowerCase();

                // Skip if no extension
                if (!fileExt) {
                  totalFilesProcessed++;
                  totalIgnoredFiles++;
                  continue;
                }

                // Get file metadata
                const stats = await fs.stat(file.path);
                const fileName = path.basename(file.path);
                const fileMtime = stats.mtime;

                // Check if file already exists in database
                const { data: existingFiles, error: existingError } =
                  await supabase
                    .from('media_items')
                    .select('id, modified_date, size_bytes')
                    .eq('file_path', file.path)
                    .maybeSingle();

                if (existingError) {
                  console.error(
                    `Error checking if file exists: ${file.path}`,
                    existingError,
                  );
                }

                // Skip if file exists and hasn't changed
                if (
                  existingFiles?.modified_date &&
                  new Date(existingFiles.modified_date).getTime() ===
                    fileMtime.getTime() &&
                  existingFiles.size_bytes === stats.size
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

                  // Import getCategoryByExtension and getMimeTypeByExtension from file-types-utils
                  const { getCategoryByExtension, getMimeTypeByExtension } =
                    await import('@/lib/file-types-utils');

                  // Determine category and mime type automatically
                  const category = getCategoryByExtension(fileExt);
                  const mimeType = getMimeTypeByExtension(fileExt);

                  // Add to database
                  const { data: newType, error: typeError } = await supabase
                    .from('file_types')
                    .upsert({
                      extension: fileExt,
                      category: category, // Use automatically determined category
                      mime_type: mimeType, // Use automatically determined mime type
                    })
                    .select('id')
                    .single();

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
                    await supabase
                      .from('file_types')
                      .select('id')
                      .eq('extension', fileExt)
                      .single();

                  if (typeError) {
                    console.error(
                      `Error getting file type ID for ${fileExt}:`,
                      typeError,
                    );
                  } else if (existingType) {
                    fileTypeId = existingType.id;
                  }
                }

                // Insert or update media item
                const fileData = {
                  file_name: fileName,
                  file_path: file.path,
                  modified_date: fileMtime.toISOString(),
                  size_bytes: stats.size,
                  file_type_id: fileTypeId,
                  folder_path: folder.path,
                };

                if (existingFiles) {
                  // Update existing file
                  const { error: updateError } = await supabase
                    .from('media_items')
                    .update(fileData)
                    .eq('id', existingFiles.id);

                  if (updateError) {
                    console.error(
                      `Error updating media item: ${file.path}`,
                      updateError,
                    );
                  } else {
                    newFilesAdded++;
                  }
                } else {
                  // Insert new file - ensure we get a response to confirm insertion
                  const { data: insertedItem, error: insertError } =
                    await supabase
                      .from('media_items')
                      .insert(fileData)
                      .select('id')
                      .single();

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
                  await sendProgress(writer, {
                    status: 'processing',
                    message: `Processed ${totalFilesProcessed} of ${totalFilesDiscovered} files`,
                    folderPath: folder.path,
                    filesDiscovered: totalFilesDiscovered,
                    filesProcessed: totalFilesProcessed,
                    newFilesAdded,
                    ignoredFilesSkipped: totalIgnoredFiles,
                    smallFilesSkipped: totalSmallFilesSkipped,
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
          await supabase
            .from('scan_folders')
            .update({ last_scanned: new Date().toISOString() })
            .eq('id', folder.id);
        } catch (folderError: any) {
          console.error(`Error scanning folder ${folder.path}:`, folderError);
          await sendProgress(writer, {
            status: 'error',
            message: `Error scanning folder: ${folder.path}`,
            error: folderError.message,
            folderPath: folder.path,
          });
        }
      }

      // Send final progress update
      await sendProgress(writer, {
        status: 'completed',
        message: `Scan completed. Processed ${totalFilesProcessed} files, skipped ${totalFilesSkipped} unchanged files, skipped ${totalIgnoredFiles} ignored file types, skipped ${totalSmallFilesSkipped} small files, added ${newFilesAdded} new/updated files.`,
        filesDiscovered: totalFilesDiscovered,
        filesProcessed: totalFilesProcessed,
        newFilesAdded,
        newFileTypes: Array.from(newFileTypes),
        ignoredFilesSkipped: totalIgnoredFiles,
        smallFilesSkipped: totalSmallFilesSkipped,
      });

      // Close the stream
      await writer.close();
    } catch (error: any) {
      console.error('Error during scan:', error);
      await sendProgress(writer, {
        status: 'error',
        message: 'Error during scan',
        error: error.message,
      });
      await writer.close();
    }
  }

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: ScanProgress,
  ) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
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

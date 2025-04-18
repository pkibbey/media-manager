'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { createServerSupabaseClient } from '@/lib/supabase';
import { canDisplayNatively, getFileCategory } from '@/lib/utils';
import type { ScanOptions, ScanProgress } from '@/types/progress-types';
import { revalidatePath } from 'next/cache';

// Size threshold for small files (10Kb)
const SMALL_FILE_THRESHOLD = 10 * 1024; // 10Kb in bytes

/**
 * Add a new folder to be scanned for media files
 */
export async function addScanFolder(
  folderPath: string,
  includeSubfolders = true,
) {
  try {
    const supabase = createServerSupabaseClient();

    // Check if folder exists
    try {
      await fs.access(folderPath);
    } catch (error) {
      console.error('Folder does not exist or is not accessible:', error);
      return {
        success: false,
        error: 'Folder path does not exist or is not accessible',
      };
    }

    // Check if folder is already in database
    const { data: existingFolder } = await supabase
      .from('scan_folders')
      .select('id')
      .eq('path', folderPath)
      .maybeSingle();

    if (existingFolder) {
      return { success: false, error: 'Folder is already added to scan list' };
    }

    // Add folder to database
    const { data, error } = await supabase
      .from('scan_folders')
      .insert({
        path: folderPath,
        include_subfolders: includeSubfolders,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding scan folder:', error);
      return { success: false, error: error.message };
    }

    // Only revalidate path after all operations are complete
    await revalidatePath('/admin');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error adding scan folder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a folder from scanning
 */
export async function removeScanFolder(folderId: number) {
  try {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('scan_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      console.error('Error removing scan folder:', error);
      return { success: false, error: error.message };
    }

    // Only revalidate path after operation is complete
    await revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error removing scan folder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all folders configured for scanning
 */
export async function getScanFolders() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('scan_folders')
      .select('*')
      .order('path');

    if (error) {
      console.error('Error getting scan folders:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error getting scan folders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Scan folders for media files and insert them into the database
 * This function uses a streaming approach to provide progress updates
 * @param options Optional scan options like ignoring small files
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
      const { ignoreSmallFiles = false } = options;

      // Get all folders to scan
      const { data: folders, error: foldersError } = await supabase
        .from('scan_folders')
        .select('*');

      if (foldersError || !folders) {
        const error = 'Error fetching scan folders';
        console.error('ScanFolders', error, foldersError);
        await sendProgress(writer, {
          status: 'error',
          message: error,
          error: foldersError?.message,
        });
        await writer.close();
        return;
      }

      // If no folders are configured, return early
      if (folders.length === 0) {
        await sendProgress(writer, {
          status: 'error',
          message: 'No folders configured for scanning',
        });
        await writer.close();
        return;
      }

      // Send initial progress update
      await sendProgress(writer, {
        status: 'started',
        message: `Starting scan of ${folders.length} folders${
          ignoreSmallFiles ? ' (ignoring files under 10kb)' : ''
        }`,
      });

      // Get all known file types, including their ignore status
      const { data: fileTypes } = await supabase.from('file_types').select('*');

      const knownExtensions = new Set(
        fileTypes?.map((ft) => ft.extension.toLowerCase()) || [],
      );

      // Create a set of ignored file extensions for faster lookup
      const ignoredExtensions = new Set(
        fileTypes
          ?.filter((ft) => ft.ignore)
          .map((ft) => ft.extension.toLowerCase()) || [],
      );

      if (ignoredExtensions.size > 0) {
        await sendProgress(writer, {
          status: 'scanning',
          message: `Will skip ${ignoredExtensions.size} ignored file types: ${Array.from(ignoredExtensions).join(', ')}`,
        });
      }

      const newFileTypes = new Set<string>();

      // Load existing files with their paths and modified dates for more effective duplicate checking
      await sendProgress(writer, {
        status: 'scanning',
        message: 'Loading existing file information...',
      });

      // Fetch all files in chunks to avoid the default 1000 row limit in Supabase
      let allExistingFiles: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('media_items')
          .select('file_path, modified_date, size_bytes')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Error fetching existing files:', error);
          break;
        }

        if (data && data.length > 0) {
          allExistingFiles = [...allExistingFiles, ...data];
          page++;

          // Update progress to show we're still loading
          if (page % 5 === 0) {
            // Every 5 pages (5000 items)
            await sendProgress(writer, {
              status: 'scanning',
              message: `Loading existing file information... (${allExistingFiles.length} items loaded)`,
            });
          }

          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Create a Map of existing files with path as key and modification timestamp + size as value
      // This allows us to skip unchanged files but still process files that have been modified
      const existingFilesMap = new Map(
        allExistingFiles.map((f) => [
          f.file_path,
          {
            modifiedDate: new Date(f.modified_date).getTime(),
            size: f.size_bytes,
          },
        ]) || [],
      );

      let totalFilesDiscovered = 0;
      let totalFilesProcessed = 0;
      let totalFilesSkipped = 0;
      let totalIgnoredFiles = 0;
      let totalSmallFilesSkipped = 0; // Track small files that are skipped
      let newFilesAdded = 0;

      // Process each folder
      for (const folder of folders) {
        await sendProgress(writer, {
          status: 'scanning',
          message: `Scanning folder: ${folder.path}`,
          folderPath: folder.path,
        });

        // Get all files in the folder
        const files = await getAllFiles(
          folder.path,
          folder.include_subfolders || false,
        );
        totalFilesDiscovered += files.length;

        await sendProgress(writer, {
          status: 'scanning',
          message: `Found ${files.length} files in ${folder.path}`,
          folderPath: folder.path,
          filesDiscovered: totalFilesDiscovered,
        });

        // Process files in batches to avoid memory issues
        const batchSize = 200; // Increased batch size for better performance
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          const newMediaItems = [];

          for (const file of batch) {
            try {
              // Check the file extension first
              const extension = path
                .extname(file.path)
                .toLowerCase()
                .substring(1);

              // Skip files with ignored extensions
              if (ignoredExtensions.has(extension)) {
                totalFilesProcessed++;
                totalIgnoredFiles++;

                // Only send updates periodically to avoid flooding the stream
                if (totalFilesProcessed % 100 === 0) {
                  await sendProgress(writer, {
                    status: 'scanning',
                    message: `Processed ${totalFilesProcessed} of ${totalFilesDiscovered} files (${totalFilesSkipped} unchanged files skipped, ${totalIgnoredFiles} ignored files skipped, ${totalSmallFilesSkipped} small files skipped)`,
                    filesDiscovered: totalFilesDiscovered,
                    filesProcessed: totalFilesProcessed,
                    newFilesAdded,
                    newFileTypes: Array.from(newFileTypes),
                    filesSkipped: totalFilesSkipped,
                    ignoredFilesSkipped: totalIgnoredFiles,
                    smallFilesSkipped: totalSmallFilesSkipped,
                  });
                }
                continue;
              }

              // Get file stats
              const stats = await fs.stat(file.path);
              const fileModifiedTime = stats.mtime.getTime();
              const fileSize = stats.size;
              const existingFile = existingFilesMap.get(file.path);

              // Skip files under 10kb if the ignoreSmallFiles option is enabled
              if (ignoreSmallFiles && fileSize < SMALL_FILE_THRESHOLD) {
                totalFilesProcessed++;
                totalSmallFilesSkipped++;

                // Only send updates periodically to avoid flooding the stream
                if (totalFilesProcessed % 100 === 0) {
                  await sendProgress(writer, {
                    status: 'scanning',
                    message: `Processed ${totalFilesProcessed} of ${totalFilesDiscovered} files (${totalFilesSkipped} unchanged files skipped, ${totalIgnoredFiles} ignored files skipped, ${totalSmallFilesSkipped} small files skipped)`,
                    filesDiscovered: totalFilesDiscovered,
                    filesProcessed: totalFilesProcessed,
                    newFilesAdded,
                    newFileTypes: Array.from(newFileTypes),
                    filesSkipped: totalFilesSkipped,
                    ignoredFilesSkipped: totalIgnoredFiles,
                    smallFilesSkipped: totalSmallFilesSkipped,
                  });
                }
                continue;
              }

              // Skip files that are already in the database AND haven't changed
              if (
                existingFile &&
                existingFile.modifiedDate === fileModifiedTime &&
                existingFile.size === fileSize
              ) {
                totalFilesProcessed++;
                totalFilesSkipped++;

                // Only send updates periodically to avoid flooding the stream
                if (totalFilesProcessed % 100 === 0) {
                  await sendProgress(writer, {
                    status: 'scanning',
                    message: `Processed ${totalFilesProcessed} of ${totalFilesDiscovered} files (${totalFilesSkipped} unchanged files skipped, ${totalIgnoredFiles} ignored files skipped, ${totalSmallFilesSkipped} small files skipped)`,
                    filesDiscovered: totalFilesDiscovered,
                    filesProcessed: totalFilesProcessed,
                    newFilesAdded,
                    newFileTypes: Array.from(newFileTypes),
                    filesSkipped: totalFilesSkipped,
                    ignoredFilesSkipped: totalIgnoredFiles,
                    smallFilesSkipped: totalSmallFilesSkipped,
                  });
                }
                continue;
              }

              // Track new file types
              if (
                !knownExtensions.has(extension) &&
                !newFileTypes.has(extension)
              ) {
                newFileTypes.add(extension);
              }

              // Create a media item record
              newMediaItems.push({
                file_path: file.path,
                file_name: path.basename(file.path),
                extension: extension,
                folder_path: path.dirname(file.path),
                size_bytes: fileSize,
                modified_date: stats.mtime.toISOString(),
                created_date: stats.birthtime.toISOString(),
                processed: false,
                organized: false,
              });

              totalFilesProcessed++;
              newFilesAdded++;

              // Send periodic updates, less frequently for better performance
              if (
                totalFilesProcessed % 100 === 0 ||
                totalFilesProcessed === totalFilesDiscovered
              ) {
                await sendProgress(writer, {
                  status: 'scanning',
                  message: `Processed ${totalFilesProcessed} of ${totalFilesDiscovered} files (${totalFilesSkipped} unchanged files skipped, ${totalIgnoredFiles} ignored files skipped, ${totalSmallFilesSkipped} small files skipped)`,
                  filesDiscovered: totalFilesDiscovered,
                  filesProcessed: totalFilesProcessed,
                  newFilesAdded,
                  newFileTypes: Array.from(newFileTypes),
                  filesSkipped: totalFilesSkipped,
                  ignoredFilesSkipped: totalIgnoredFiles,
                  smallFilesSkipped: totalSmallFilesSkipped,
                });
              }
            } catch (fileError) {
              console.error(`Error processing file ${file.path}:`, fileError);
              // Continue with the next file in case of error
              totalFilesProcessed++;
            }
          }

          // Insert new media items in batches
          if (newMediaItems.length > 0) {
            try {
              const { error: insertError } = await supabase
                .from('media_items')
                .upsert(newMediaItems, {
                  onConflict: 'file_path',
                  ignoreDuplicates: false,
                });

              if (insertError) {
                console.error('Error inserting media items:', insertError);

                // Send detailed error message to help debugging
                await sendProgress(writer, {
                  status: 'error',
                  message: `Error inserting batch of media items: ${insertError.message}. 
                  Code: ${insertError.code}, Details: ${insertError.details || 'No details'}`,
                  filesDiscovered: totalFilesDiscovered,
                  filesProcessed: totalFilesProcessed,
                  newFilesAdded,
                });

                // If it's a validation error, try to insert one by one to find problematic records
                if (
                  insertError.code === '23502' ||
                  insertError.code === '23505' ||
                  insertError.code === '23514' ||
                  insertError.message.includes('violates')
                ) {
                  await sendProgress(writer, {
                    status: 'scanning',
                    message:
                      'Trying to insert items individually due to validation error...',
                    filesDiscovered: totalFilesDiscovered,
                    filesProcessed: totalFilesProcessed,
                  });

                  // Try to insert items one by one to find the problematic ones
                  let successCount = 0;
                  for (const item of newMediaItems) {
                    try {
                      const { error: singleError } = await supabase
                        .from('media_items')
                        .upsert([item], {
                          onConflict: 'file_path',
                          ignoreDuplicates: false,
                        });

                      if (!singleError) {
                        successCount++;
                      } else {
                        console.error(
                          `Failed to insert item ${item.file_path}: ${singleError.message}`,
                        );
                      }
                    } catch (e) {
                      console.error(
                        `Exception inserting item ${item.file_path}:`,
                        e,
                      );
                    }
                  }

                  // Update the newFilesAdded count to reflect actual insertions
                  const previouslyAdded = newFilesAdded;
                  newFilesAdded =
                    newFilesAdded - (newMediaItems.length - successCount);

                  await sendProgress(writer, {
                    status: 'scanning',
                    message: `Individual insert: ${successCount} of ${newMediaItems.length} succeeded. Adjusted count from ${previouslyAdded} to ${newFilesAdded}.`,
                    filesDiscovered: totalFilesDiscovered,
                    filesProcessed: totalFilesProcessed,
                    newFilesAdded,
                  });
                }
              }
            } catch (batchError: any) {
              console.error('Error processing batch:', batchError);

              // Send error information to client
              await sendProgress(writer, {
                status: 'error',
                message: `Exception during batch insert: ${batchError.message || 'Unknown error'}`,
                filesDiscovered: totalFilesDiscovered,
                filesProcessed: totalFilesProcessed,
                newFilesAdded,
              });
            }
          }
        }

        // Update last_scanned timestamp for the folder
        await supabase
          .from('scan_folders')
          .update({ last_scanned: new Date().toISOString() })
          .eq('id', folder.id);
      }

      // Add any new file types to the database
      if (newFileTypes.size > 0) {
        await sendProgress(writer, {
          status: 'scanning',
          message: `Adding ${newFileTypes.size} new file types to database...`,
          newFileTypes: Array.from(newFileTypes),
        });

        for (const extension of newFileTypes) {
          const category = await getFileCategory(extension);
          await supabase.from('file_types').insert({
            extension,
            category,
            can_display_natively: canDisplayNatively(extension),
            needs_conversion: !canDisplayNatively(extension),
            ignore: false,
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
        filesSkipped: totalFilesSkipped,
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

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && includeSubfolders) {
          files.push(...(await getAllFiles(fullPath, true)));
        } else if (entry.isFile()) {
          files.push({ path: fullPath });
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return files;
  }
}

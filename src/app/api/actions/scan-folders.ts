'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { createServerSupabaseClient } from '@/lib/supabase';
import { canDisplayNatively } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

// Types for scan progress reporting
export type ScanProgress = {
  status: 'started' | 'scanning' | 'completed' | 'error';
  message: string;
  folderPath?: string;
  filesDiscovered?: number;
  filesProcessed?: number;
  newFilesAdded?: number;
  newFileTypes?: string[];
  error?: string;
};

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
 */
export async function scanFolders() {
  const encoder = new TextEncoder();

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start scanning in the background
  scanFoldersInternal(writer);

  // Return the readable stream
  return stream.readable;

  async function scanFoldersInternal(writer: WritableStreamDefaultWriter) {
    try {
      const supabase = createServerSupabaseClient();

      // Get all folders to scan
      const { data: folders, error: foldersError } = await supabase
        .from('scan_folders')
        .select('*');

      if (foldersError || !folders) {
        const error = 'Error fetching scan folders';
        console.error(error, foldersError);
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

      // Get all existing file paths in the database
      const { data: existingFiles } = await supabase
        .from('media_items')
        .select('file_path');

      // Create a Set of existing files for faster lookup
      const existingFilesSet = new Set(
        existingFiles?.map((f) => f.file_path) || [],
      );

      // Get all known file types
      const { data: fileTypes } = await supabase.from('file_types').select('*');

      const knownExtensions = new Set(
        fileTypes?.map((ft) => ft.extension.toLowerCase()) || [],
      );
      const newFileTypes = new Set<string>();

      let totalFilesDiscovered = 0;
      let totalFilesProcessed = 0;
      let newFilesAdded = 0;

      // Send initial progress update
      await sendProgress(writer, {
        status: 'started',
        message: `Starting scan of ${folders.length} folders`,
      });

      // Process each folder
      for (const folder of folders) {
        await sendProgress(writer, {
          status: 'scanning',
          message: `Scanning folder: ${folder.path}`,
          folderPath: folder.path,
        });

        // Get all files in the folder
        const files = await getAllFiles(folder.path, folder.include_subfolders);
        totalFilesDiscovered += files.length;

        await sendProgress(writer, {
          status: 'scanning',
          message: `Found ${files.length} files in ${folder.path}`,
          folderPath: folder.path,
          filesDiscovered: totalFilesDiscovered,
        });

        // Process files in batches to avoid memory issues
        const batchSize = 100;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          const newMediaItems = [];

          for (const file of batch) {
            // Skip files that are already in the database
            if (existingFilesSet.has(file.path)) {
              totalFilesProcessed++;
              continue;
            }

            const extension = path
              .extname(file.path)
              .toLowerCase()
              .substring(1);

            // Track new file types
            if (
              !knownExtensions.has(extension) &&
              !newFileTypes.has(extension)
            ) {
              newFileTypes.add(extension);
            }

            // Create a media item record
            const stats = await fs.stat(file.path);

            newMediaItems.push({
              file_path: file.path,
              file_name: path.basename(file.path),
              extension: extension,
              folder_path: path.dirname(file.path),
              size_bytes: stats.size,
              modified_date: stats.mtime.toISOString(),
              created_date: stats.birthtime.toISOString(),
              processed: false,
              organized: false,
            });

            totalFilesProcessed++;
            newFilesAdded++;

            // Send periodic updates
            if (
              totalFilesProcessed % 50 === 0 ||
              totalFilesProcessed === totalFilesDiscovered
            ) {
              await sendProgress(writer, {
                status: 'scanning',
                message: `Processed ${totalFilesProcessed} of ${totalFilesDiscovered} files`,
                filesDiscovered: totalFilesDiscovered,
                filesProcessed: totalFilesProcessed,
                newFilesAdded,
                newFileTypes: Array.from(newFileTypes),
              });
            }
          }

          // Insert new media items in batches
          if (newMediaItems.length > 0) {
            const { error: insertError } = await supabase
              .from('media_items')
              .insert(newMediaItems);

            if (insertError) {
              console.error('Error inserting media items:', insertError);
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
      for (const extension of newFileTypes) {
        await supabase.from('file_types').insert({
          extension,
          category: guessFileCategory(extension),
          can_display_natively: canDisplayNatively(extension),
          needs_conversion: !canDisplayNatively(extension),
        });
      }

      // Send final progress update
      await sendProgress(writer, {
        status: 'completed',
        message: `Scan completed. Added ${newFilesAdded} new files.`,
        filesDiscovered: totalFilesDiscovered,
        filesProcessed: totalFilesProcessed,
        newFilesAdded,
        newFileTypes: Array.from(newFileTypes),
      });

      // Update UI after all operations are complete
      try {
        await revalidatePath('/admin');
        await revalidatePath('/browse');
        await revalidatePath('/folders');
      } catch (error) {
        console.error('Error revalidating paths:', error);
      }

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

  function guessFileCategory(extension: string): string {
    const imageExtensions = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'avif',
      'heic',
      'tiff',
      'raw',
      'bmp',
      'svg',
    ];
    const videoExtensions = [
      'mp4',
      'webm',
      'mov',
      'avi',
      'mkv',
      'flv',
      'wmv',
      'm4v',
    ];
    const dataExtensions = ['json', 'xml', 'txt', 'csv'];

    if (imageExtensions.includes(extension.toLowerCase())) {
      return 'image';
    }
    if (videoExtensions.includes(extension.toLowerCase())) {
      return 'video';
    }
    if (dataExtensions.includes(extension.toLowerCase())) {
      return 'data';
    }
    return 'other';
  }
}

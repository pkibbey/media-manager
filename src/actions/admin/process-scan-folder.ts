'use server';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileTypeFromFile } from 'file-type';
import { processScanResults } from '@/actions/admin/process-directory';
import type { FileDetails } from '@/types/scan-types';
import { getOrCreateMediaType } from './manage-media-types';

/**
 * Recursively get all files from a folder
 *
 * @param folderPath - The path to the folder to scan
 * @returns An array of Files and Directories objects
 */
async function getFilesAnDirectories(folderPath: string): Promise<{
  files?: FileDetails[];
  directories?: string[];
}> {
  // Read directory contents
  const entries = await fs.readdir(folderPath, {
    withFileTypes: true,
  });
  const directories = entries.filter((entry) => entry.isDirectory());
  const filesInDir = entries.filter((entry) => entry.isFile());
  const files: FileDetails[] = [];

  // Process each entry
  for (const entry of filesInDir) {
    const fullPath = path.join(folderPath, entry.name);

    try {
      // Get file stats
      const stats = await fs.stat(fullPath);

      const FileType = await fileTypeFromFile(fullPath);

      const mimeType = FileType?.mime || 'application/octet-stream';
      console.log('mimeType: ', mimeType);

      const mediaTypeId = await getOrCreateMediaType(mimeType);

      if (!mediaTypeId) {
        // Log the warning but continue processing
        console.warn(
          `Could not determine media type for ${FileType?.mime}/${mimeType} - found ${entry.name}, skipping file`,
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

  return {
    files,
    directories: directories.map((dir) => dir.name),
  };
}

/**
 * Process a folder scan by analyzing and adding files to the database
 *
 * @param folderPath Path to the folder to scan
 * @returns Object with count of processed items and any errors
 */
export async function processScanFolder(folderPath: string): Promise<{
  success: boolean;
  processed: number;
  skipped: number;
  total: number;
  directories?: string[];
}> {
  try {
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Invalid folder path provided');
    }

    // Check if folder exists and is readable
    try {
      await fs.access(folderPath);
    } catch (_error) {
      throw new Error(`Cannot access folder at path: ${folderPath}`);
    }

    const { files, directories } = await getFilesAnDirectories(folderPath);
    console.log('files: ', files);

    if (!files || files.length === 0) {
      return {
        success: true,
        processed: 0,
        skipped: 0,
        total: 0,
        directories,
      };
    }

    const results = await processScanResults(files);

    return {
      success: true,
      processed: results.filesAdded,
      skipped: results.filesSkipped,
      total: files.length,
      directories,
    };
  } catch (error) {
    console.error('Error in folder scan processing:', error);
    return {
      success: false,
      processed: 0,
      skipped: 0,
      total: 0,
      directories: [],
    };
  }
}

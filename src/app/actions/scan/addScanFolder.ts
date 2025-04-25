'use server';

import fs from 'node:fs/promises';
import { revalidatePath } from 'next/cache';
import { addScanFolder as addScanFolderHelper } from '@/lib/query-helpers';

/**
 * Add a new folder to be scanned for media files
 */
export async function addScanFolder(
  folderPath: string,
  includeSubfolders = true,
) {
  try {
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

    // Add folder to database using the helper function
    const { data, error } = await addScanFolderHelper(
      folderPath,
      includeSubfolders,
    );

    if (error) {
      console.error('Error adding scan folder:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');

    return { success: true, data, error: null };
  } catch (error: any) {
    console.error('Error adding scan folder:', error);
    return { success: false, error: error.message };
  }
}

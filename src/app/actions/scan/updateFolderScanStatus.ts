'use server';

import { revalidatePath } from 'next/cache';
import { updateFolderScanStatus as updateFolderScanStatusHelper } from '@/lib/query-helpers';

/**
 * Update the scan status for a folder
 * @param folderId ID of the folder to update
 * @param resetStatus If true, sets last_scanned to null to mark folder for rescanning
 * @returns Operation result
 */
export async function updateFolderScanStatus(
  folderId: number,
  resetStatus = false,
) {
  try {
    const result = await updateFolderScanStatusHelper(folderId, resetStatus);

    if (!result.success) {
      console.error('Error updating folder scan status:', result.error);
      return { success: false, error: result.error };
    }

    // Refresh the admin UI
    revalidatePath('/admin');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating folder scan status:', error);
    return { success: false, error: error.message };
  }
}

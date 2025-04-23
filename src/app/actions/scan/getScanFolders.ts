'use server';

import { getScanFolders as getScanFoldersHelper } from '@/lib/query-helpers';

/**
 * Get all folders configured for scanning
 */
export async function getScanFolders() {
  try {
    const { data, error } = await getScanFoldersHelper();

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

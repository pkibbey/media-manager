'use server';

import { getAllFileTypes as getFileTypesHelper } from '@/lib/query-helpers';

/**
 * Get all file types
 */
export async function getAllFileTypes() {
  try {
    const result = await getFileTypesHelper();

    // Check if the result contains an error
    if (result.error) {
      console.error('Error fetching file types:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Error getting file types:', error);
    return { success: false, error: error.message };
  }
}

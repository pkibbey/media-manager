'use server';

import { getAllFileTypes as getFileTypesHelper, updateFileType as updateFileTypeHelper } from '@/lib/query-helpers';
import { revalidatePath } from 'next/cache';

/**
 * Get all file types
 */
export async function getAllFileTypes() {
  try {
    const result = await getFileTypesHelper();
    
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

/**
 * Update a file type's properties
 */
export async function updateFileType(
  id: number,
  updates: {
    category?: string;
    mime_type?: string | null;
    can_display_natively?: boolean;
    needs_conversion?: boolean;
    ignore?: boolean;
  },
) {
  try {
    const result = await updateFileTypeHelper(id, updates);
    
    if (!result.success) {
      console.error('Error updating file type:', result.error);
      return { success: false, error: result.error };
    }

    revalidatePath('/admin');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating file type:', error);
    return { success: false, error: error.message };
  }
}

'use server';

import { removeScanFolder as removeScanFolderHelper } from '@/lib/query-helpers';
import { revalidatePath } from 'next/cache';

/**
 * Remove a folder from scanning
 */
export async function removeScanFolder(folderId: number) {
  try {
    const { error } = await removeScanFolderHelper(folderId);

    if (error) {
      console.error('Error removing scan folder:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');

    return { success: true };
  } catch (error: any) {
    console.error('Error removing scan folder:', error);
    return { success: false, error: error.message };
  }
}

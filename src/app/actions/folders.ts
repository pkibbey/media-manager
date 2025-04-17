'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { FolderNode } from '@/types/folder-types';

/**
 * Get the folder structure for browsing
 */
export async function getFolderStructure() {
  try {
    const supabase = createServerSupabaseClient();

    // Get distinct folder paths and their direct item counts from the database
    const { data: folderCounts, error: folderCountsError } = await supabase
      .from('media_items')
      .select('folder_path, count()');

    if (folderCountsError) {
      console.error(
        'Error fetching folder paths and counts:',
        folderCountsError,
      );
      return { success: false, error: folderCountsError.message };
    }

    const uniqueFolders = new Set<string>();
    const folderTotalCounts = new Map<string, number>();
    const rootNode: FolderNode[] = [];
    const rootPath = '/';
    uniqueFolders.add(rootPath); // Add root path
    folderTotalCounts.set(rootPath, 0); // Initialize root count
    folderCounts?.forEach((item) => {
      const folderPath = item.folder_path || '';
      const count = item.count || 0;

      // Add the folder path to the set
      uniqueFolders.add(folderPath);

      // Update the total count for this folder path
      folderTotalCounts.set(folderPath, count);
    });

    // Add each folder path to the tree structure
    Array.from(uniqueFolders)
      .sort()
      .forEach((folderPath) => {
        if (folderPath === '/') return; // Skip root node, already added

        const parts = folderPath.split('/').filter(Boolean);
        let currentLevel = rootNode;
        let currentPath = '/';

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLastPart = i === parts.length - 1;
          currentPath =
            currentPath === '/' ? `/${part}` : `${currentPath}/${part}`;

          // Check if this path already exists in the current level
          let foundNode = currentLevel.find((n) => n.name === part);

          if (!foundNode) {
            // Add new node if it doesn't exist
            foundNode = {
              name: part,
              path: currentPath,
              children: [],
              mediaCount: folderTotalCounts.get(currentPath) || 0,
            };
            currentLevel.push(foundNode);
          }

          if (isLastPart) {
            foundNode.mediaCount = folderTotalCounts.get(folderPath) || 0;
          }

          // Move to the next level
          currentLevel = foundNode.children;
        }
      });

    return { success: true, data: rootNode };
  } catch (error: any) {
    console.error('Error getting folder structure:', error);
    return { data: [], success: false, error: error.message };
  }
}

/**
 * Get media items for a specific folder path
 */
export async function getMediaItemsByFolder(
  folderPath: string,
  page = 1,
  pageSize = 50,
  includeSubfolders = false,
) {
  try {
    const supabase = createServerSupabaseClient();
    const offset = (page - 1) * pageSize;

    // Get ignored file extensions first
    const { data: ignoredTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      ignoredTypes?.map((type) => type.extension.toLowerCase()) || [];

    // Build ignore filter condition
    const ignoreFilter =
      ignoredExtensions.length > 0
        ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
        : '("")';

    // Get current folder count with direct query
    const currentFolderCountQuery = supabase
      .from('media_items')
      .select('id', { count: 'exact', head: true })
      .eq('folder_path', folderPath)
      .not('extension', 'in', ignoreFilter);

    const { count: currentFolderCount, error: currentFolderError } =
      await currentFolderCountQuery;

    if (currentFolderError) {
      console.error(
        'Error counting items in current folder:',
        currentFolderError,
      );
      return { success: false, error: currentFolderError.message };
    }

    // Only get subfolder count if requested
    let subfolderCount = 0;
    if (includeSubfolders && folderPath !== '/') {
      const subfolderCountQuery = supabase
        .from('media_items')
        .select('id', { count: 'exact', head: true })
        .like('folder_path', `${folderPath}/%`)
        .not('extension', 'in', ignoreFilter);

      const { count: subfoldersCount, error: subfolderError } =
        await subfolderCountQuery;

      if (subfolderError) {
        console.error('Error counting items in subfolders:', subfolderError);
        return { success: false, error: subfolderError.message };
      }

      subfolderCount = subfoldersCount || 0;
    }

    return {
      success: true,
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil((currentFolderCount || 0) / pageSize),
        total: (currentFolderCount || 0) + subfolderCount,
      },
      stats: {
        currentFolderCount: currentFolderCount || 0,
        subfolderCount,
      },
    };
  } catch (error: any) {
    console.error('Error getting media items by folder:', error);
    return { data: [], success: false, error: error.message };
  }
}

/**
 * Helper function to get the parent path
 */
function getParentPath(path: string): string {
  if (path === '/' || !path.includes('/')) return '';

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 1) return '/';

  parts.pop();
  return `/${parts.join('/')}`;
}

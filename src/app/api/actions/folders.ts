'use server';

import type { FolderNode } from '@/components/folders/folder-tree';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Get the folder structure for browsing
 */
export async function getFolderStructure() {
  try {
    const supabase = createServerSupabaseClient();

    // Get all folder paths from the database
    const { data: mediaItems, error } = await supabase
      .from('media_items')
      .select('folder_path, id');

    if (error) {
      console.error('Error fetching folder paths:', error);
      return { success: false, error: error.message };
    }

    // Count media items in each folder
    const folderCounts = new Map<string, number>();
    mediaItems?.forEach((item) => {
      const folderPath = item.folder_path;
      folderCounts.set(folderPath, (folderCounts.get(folderPath) || 0) + 1);

      // Also count for parent folders
      let parentPath = getParentPath(folderPath);
      while (parentPath !== '') {
        folderCounts.set(parentPath, (folderCounts.get(parentPath) || 0) + 1);
        parentPath = getParentPath(parentPath);
      }
    });

    // Build the folder structure
    const uniqueFolders = new Set<string>();
    mediaItems?.forEach((item) => uniqueFolders.add(item.folder_path));

    const rootNode: FolderNode[] = [
      {
        name: 'Root',
        path: '/',
        children: [],
        mediaCount: folderCounts.get('/') || 0,
      },
    ];

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
              mediaCount: folderCounts.get(currentPath) || 0,
            };
            currentLevel.push(foundNode);
          }

          if (isLastPart) {
            foundNode.mediaCount = folderCounts.get(folderPath) || 0;
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

    // Use pattern matching for subfolders or exact match
    const query = supabase.from('media_items').select('*', { count: 'exact' });

    // Exclude ignored file types
    if (ignoredExtensions.length > 0) {
      query.not(
        'extension',
        'in',
        `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
      );
    }

    if (includeSubfolders) {
      if (folderPath === '/') {
        // No filtering needed, include all
      } else {
        // Include the current folder and all subfolders
        query.or(
          `folder_path.eq.${folderPath},folder_path.like.${folderPath}/%`,
        );
      }
    } else {
      // Exact match on folder path
      query.eq('folder_path', folderPath);
    }

    // Add pagination
    const { data, error, count } = await query
      .order('media_date', { ascending: false, nullsFirst: false })
      .order('created_date', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching media items:', error);
      return { success: false, error: error.message };
    }

    // Calculate pagination data
    const pagination = {
      page,
      pageSize,
      pageCount: Math.ceil((count || 0) / pageSize),
      total: count || 0,
    };

    return { success: true, data, pagination };
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

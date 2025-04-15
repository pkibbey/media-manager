'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

export type FolderStructure = {
  path: string;
  name: string;
  parent: string | null;
  isRoot: boolean;
  itemCount: number;
  subfolders: FolderStructure[];
};

// Get a flat list of all folders that contain media items
export async function getAllFolders() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('media_items')
      .select('folder_path')
      .order('folder_path');

    if (error) {
      console.error('Error fetching folders:', error);
      return { success: false, error: error.message };
    }

    // Create a Set to store unique folder paths
    const uniqueFolderPaths = new Set<string>();

    // Add each folder path and all parent folders
    data?.forEach((item) => {
      let currentPath = item.folder_path;
      uniqueFolderPaths.add(currentPath);

      // Add all parent folders
      while (currentPath !== '/' && currentPath !== '') {
        currentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        if (currentPath === '') {
          // Handle root directory case
          currentPath = '/';
        }
        uniqueFolderPaths.add(currentPath);
      }
    });

    // Convert Set back to sorted array
    const folderPaths = Array.from(uniqueFolderPaths).sort();

    return { success: true, data: folderPaths };
  } catch (error: any) {
    console.error('Error getting folders:', error);
    return { success: false, error: error.message };
  }
}

// Build a hierarchical folder structure from a flat list of paths
export async function getFolderStructure() {
  try {
    const { success, data: folderPaths, error } = await getAllFolders();

    if (!success || !folderPaths) {
      return { success: false, error: error || 'Failed to fetch folders' };
    }

    const supabase = createServerSupabaseClient();

    // Get item counts for each folder
    const folderCounts: Record<string, number> = {};

    for (const path of folderPaths) {
      const { count, error } = await supabase
        .from('media_items')
        .select('id', { count: 'exact', head: true })
        .eq('folder_path', path);

      if (error) {
        console.error(`Error counting items in folder ${path}:`, error);
        folderCounts[path] = 0;
      } else {
        folderCounts[path] = count || 0;
      }
    }

    // Build the folder structure
    const root: FolderStructure = {
      path: '/',
      name: 'Root',
      parent: null,
      isRoot: true,
      itemCount: folderCounts['/'] || 0,
      subfolders: [],
    };

    const folderMap: Record<string, FolderStructure> = {
      '/': root,
    };

    // Sort paths to ensure parents are processed before children
    const sortedPaths = [...folderPaths].sort(
      (a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b),
    );

    for (const path of sortedPaths) {
      if (path === '/') continue; // Skip root as it's already created

      const name = path.split('/').pop() || path;
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      const parent = parentPath === '' ? '/' : parentPath;

      const folder: FolderStructure = {
        path,
        name,
        parent,
        isRoot: false,
        itemCount: folderCounts[path] || 0,
        subfolders: [],
      };

      folderMap[path] = folder;

      // Add to parent's subfolders
      if (folderMap[parent]) {
        folderMap[parent].subfolders.push(folder);
      } else {
        console.warn(`Parent folder not found for ${path}`);
      }
    }

    // Sort subfolders by name
    const sortFolders = (folder: FolderStructure) => {
      folder.subfolders.sort((a, b) => a.name.localeCompare(b.name));
      folder.subfolders.forEach(sortFolders);
    };

    sortFolders(root);

    return { success: true, data: root };
  } catch (error: any) {
    console.error('Error building folder structure:', error);
    return { success: false, error: error.message };
  }
}

// Get media items in a specific folder with pagination
export async function getMediaItemsByFolder(
  folderPath: string,
  page = 1,
  pageSize = 50,
  includeSubfolders = false,
) {
  try {
    const supabase = createServerSupabaseClient();

    // Calculate pagination offsets
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('media_items').select('*');

    // Apply folder path filtering
    if (includeSubfolders) {
      // For subfolders, use a prefix match to include items from all subfolders
      query = query.ilike('folder_path', `${folderPath}%`);
    } else {
      // For exact folder match, just use equality
      query = query.eq('folder_path', folderPath);
    }

    // Get total count for pagination
    const countQuery = supabase
      .from('media_items')
      .select('id', { count: 'exact', head: true });

    // Apply the same folder path filtering to count query
    if (includeSubfolders) {
      countQuery.ilike('folder_path', `${folderPath}%`);
    } else {
      countQuery.eq('folder_path', folderPath);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting media items:', countError);
      return { success: false, error: countError.message };
    }

    // Get media items with pagination
    const { data, error } = await query.order('file_name').range(from, to);

    if (error) {
      console.error('Error fetching media items:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        pageSize,
        pageCount: Math.ceil((count || 0) / pageSize),
      },
      includeSubfolders,
    };
  } catch (error: any) {
    console.error('Error getting media items:', error);
    return { success: false, error: error.message };
  }
}

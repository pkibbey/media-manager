'use server';

import { PAGE_SIZE } from '@/lib/consts';
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

interface MediaItemsFilter {
  search?: string;
  type?: 'all' | 'image' | 'video' | 'data';
  sortBy?: 'date' | 'name' | 'size' | 'type';
  sortOrder?: 'asc' | 'desc';
  hasThumbnail?: 'all' | 'yes' | 'no';
}

/**
 * Get media items for a specific folder path with optional filtering
 */
export async function getMediaItemsByFolder(
  folderPath: string,
  page = 1,
  pageSize = PAGE_SIZE,
  includeSubfolders = false,
  filters: MediaItemsFilter = {},
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

    // Now fetch the actual media items based on the folder path
    let mediaItemsQuery = supabase
      .from('media_items')
      .select('*')
      .not('extension', 'in', ignoreFilter);

    // Apply folder path filtering based on whether to include subfolders
    if (includeSubfolders && folderPath !== '/') {
      // For non-root paths with subfolders, get current folder and all subfolders
      mediaItemsQuery = mediaItemsQuery.or(
        `folder_path.eq.${folderPath},folder_path.like.${folderPath}/%`,
      );
    } else if (folderPath === '/') {
      // Root folder without subfolders - just get items at the root level
      mediaItemsQuery = mediaItemsQuery.eq('folder_path', folderPath);
    } else {
      // Specific folder without subfolders
      mediaItemsQuery = mediaItemsQuery.eq('folder_path', folderPath);
    }

    // Apply additional filters if provided
    if (filters.search?.trim()) {
      mediaItemsQuery = mediaItemsQuery.ilike(
        'file_name',
        `%${filters.search}%`,
      );
    }

    if (filters.type && filters.type !== 'all') {
      if (filters.type === 'image') {
        mediaItemsQuery = mediaItemsQuery.in('extension', [
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'heic',
          'heif',
          'raw',
          'tiff',
          'tif',
        ]);
      } else if (filters.type === 'video') {
        mediaItemsQuery = mediaItemsQuery.in('extension', [
          'mp4',
          'mov',
          'avi',
          'mkv',
          'webm',
          'wmv',
          'flv',
          'm4v',
        ]);
      } else if (filters.type === 'data') {
        mediaItemsQuery = mediaItemsQuery.not(
          'extension',
          'in',
          '("jpg","jpeg","png","gif","webp","heic","heif","raw","tiff","tif","mp4","mov","avi","mkv","webm","wmv","flv","m4v")',
        );
      }
    }

    if (filters.hasThumbnail && filters.hasThumbnail !== 'all') {
      if (filters.hasThumbnail === 'yes') {
        mediaItemsQuery = mediaItemsQuery
          .not('thumbnail_path', 'is', null)
          .not('thumbnail_path', 'like', 'skipped:%');
      } else {
        mediaItemsQuery = mediaItemsQuery.or(
          'thumbnail_path.is.null,thumbnail_path.like.skipped:%',
        );
      }
    }

    // Apply sorting
    const sortField = filters.sortBy || 'date';
    const sortDirection = filters.sortOrder || 'desc';

    let orderField = 'media_date';
    if (sortField === 'name') orderField = 'file_name';
    else if (sortField === 'size') orderField = 'file_size';
    else if (sortField === 'type') orderField = 'extension';

    mediaItemsQuery = mediaItemsQuery.order(orderField, {
      ascending: sortDirection === 'asc',
      nullsFirst: sortDirection === 'asc',
    });

    // Clone the query for counting
    const countQuery = supabase
      .from('media_items')
      .select('id', { count: 'exact', head: true })
      .not('extension', 'in', ignoreFilter);

    // Apply the same filters to the count query
    if (includeSubfolders && folderPath !== '/') {
      countQuery.or(
        `folder_path.eq.${folderPath},folder_path.like.${folderPath}/%`,
      );
    } else if (folderPath === '/') {
      countQuery.eq('folder_path', folderPath);
    } else {
      countQuery.eq('folder_path', folderPath);
    }

    if (filters.search?.trim()) {
      countQuery.ilike('file_name', `%${filters.search}%`);
    }

    if (filters.type && filters.type !== 'all') {
      if (filters.type === 'image') {
        countQuery.in('extension', [
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'heic',
          'heif',
          'raw',
          'tiff',
          'tif',
        ]);
      } else if (filters.type === 'video') {
        countQuery.in('extension', [
          'mp4',
          'mov',
          'avi',
          'mkv',
          'webm',
          'wmv',
          'flv',
          'm4v',
        ]);
      } else if (filters.type === 'data') {
        countQuery.not(
          'extension',
          'in',
          '("jpg","jpeg","png","gif","webp","heic","heif","raw","tiff","tif","mp4","mov","avi","mkv","webm","wmv","flv","m4v")',
        );
      }
    }

    if (filters.hasThumbnail && filters.hasThumbnail !== 'all') {
      if (filters.hasThumbnail === 'yes') {
        countQuery
          .not('thumbnail_path', 'is', null)
          .not('thumbnail_path', 'like', 'skipped:%');
      } else {
        countQuery.or('thumbnail_path.is.null,thumbnail_path.like.skipped:%');
      }
    }

    // Execute the count query
    const { count: filteredCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting filtered items:', countError);
      return { success: false, error: countError.message };
    }

    // Now apply pagination to the main query
    mediaItemsQuery = mediaItemsQuery.range(offset, offset + pageSize - 1);

    // Execute the main query
    const { data: mediaItems, error: mediaItemsError } = await mediaItemsQuery;

    if (mediaItemsError) {
      console.error('Error fetching media items:', mediaItemsError);
      return { success: false, error: mediaItemsError.message };
    }

    return {
      success: true,
      data: mediaItems || [],
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil((filteredCount || 0) / pageSize),
        total: filteredCount || 0,
      },
    };
  } catch (error: any) {
    console.error('Error getting media items by folder:', error);
    return { data: [], success: false, error: error.message };
  }
}

'use client';

import {
  getFolderStructure,
  getMediaItemsByFolder,
} from '@/app/api/actions/folders';
import FolderPagination from '@/components/folders/folder-pagination';
import FolderTree, { type FolderNode } from '@/components/folders/folder-tree';
import FolderViewToggle from '@/components/folders/folder-view-toggle';
import MediaList from '@/components/folders/media-list';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

export default function FoldersPage() {
  const [folderStructure, setFolderStructure] = useState<FolderNode[]>([]);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({
    page: 1,
    pageSize: 50,
    pageCount: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState('/');
  const [includeSubfolders, setIncludeSubfolders] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initial data loading
  useEffect(() => {
    const loadFolderStructure = async () => {
      try {
        const { success, data, error } = await getFolderStructure();
        if (success && data) {
          setFolderStructure(data);
        } else {
          console.error('Error loading folder structure:', error);
        }
      } catch (error) {
        console.error('Error fetching folder structure:', error);
      }
    };

    loadFolderStructure();
  }, []);

  // Effect for URL parameters
  useEffect(() => {
    const folder = searchParams.get('folder') || '/';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const subfolders = searchParams.get('subfolders') === 'true';

    setCurrentFolder(folder);
    setIncludeSubfolders(subfolders);

    const loadMediaItems = async () => {
      setLoading(true);
      try {
        const { success, data, pagination, error } =
          await getMediaItemsByFolder(folder, page, 50, subfolders);

        if (success && data) {
          setMediaItems(data);
          setPagination(
            pagination || {
              page,
              pageSize: 50,
              pageCount: 1,
              total: data.length,
            },
          );
        } else {
          console.error('Error loading media items:', error);
          setMediaItems([]);
        }
      } catch (error) {
        console.error('Error fetching media items:', error);
        setMediaItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadMediaItems();
  }, [searchParams]);

  // Handle folder change
  const handleFolderSelect = useCallback(
    (folderPath: string) => {
      const params = new URLSearchParams();
      params.set('folder', folderPath);
      params.set('page', '1');
      if (includeSubfolders) {
        params.set('subfolders', 'true');
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, includeSubfolders],
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('page', page.toString());
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // Handle subfolder toggle
  const handleSubfolderToggle = useCallback(
    (include: boolean) => {
      const params = new URLSearchParams(searchParams);
      if (include) {
        params.set('subfolders', 'true');
      } else {
        params.delete('subfolders');
      }
      params.set('page', '1'); // Reset to first page on toggle
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar - folder tree */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold mb-4">Folders</h2>
            <Suspense fallback={<div>Loading folders...</div>}>
              <FolderTree
                folders={folderStructure}
                currentFolder={currentFolder}
                onSelect={handleFolderSelect}
              />
            </Suspense>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold truncate">
              {currentFolder === '/'
                ? 'All Files'
                : currentFolder.split('/').pop()}
            </h2>
            <FolderViewToggle
              includeSubfolders={includeSubfolders}
              onChange={handleSubfolderToggle}
            />
          </div>

          {loading ? (
            <div className="py-12 text-center">Loading media items...</div>
          ) : (
            <>
              <MediaList items={mediaItems} />
              {pagination.pageCount > 1 && (
                <div className="mt-6">
                  <FolderPagination
                    currentPage={pagination.page}
                    totalPages={pagination.pageCount}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

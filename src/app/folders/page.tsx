import FolderTree from '@/components/folders/folder-tree';
import FolderViewToggle from '@/components/folders/folder-view-toggle';
import MediaList from '@/components/folders/media-list';
import { Pagination } from '@/components/ui/pagination';
import { ChevronRightIcon, CubeIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  getFolderStructure,
  getMediaItemsByFolder,
} from '../api/actions/folders';

export default async function FoldersPage({
  searchParams,
}: {
  searchParams: { path?: string; page?: string; includeSubfolders?: string };
}) {
  const selectedPath = searchParams.path || '/';
  const currentPage = Number.parseInt(searchParams.page || '1', 10);
  const includeSubfolders = searchParams.includeSubfolders === 'true';

  // Get folder structure for the sidebar
  const {
    success: folderSuccess,
    data: folderStructure,
    error: folderError,
  } = await getFolderStructure();

  // Get media items for the selected folder
  const {
    success: mediaSuccess,
    data: mediaItems,
    pagination,
    error: mediaError,
  } = await getMediaItemsByFolder(
    selectedPath,
    currentPage,
    50,
    includeSubfolders,
  );

  // Get the path parts for the breadcrumb
  const pathParts = selectedPath.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const path = `/${pathParts.slice(0, index + 1).join('/')}`;
    return { name: part, path };
  });

  // Handle not found or errors
  if (!folderSuccess || !mediaSuccess) {
    // For simplicity, we're just showing a not found page
    // In a real app, you might want to show specific error messages
    return notFound();
  }

  // Build the base URL for pagination and toggle links
  const basePath = `/folders?path=${encodeURIComponent(selectedPath)}`;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Browse by Folder</h1>

      {/* Breadcrumb navigation */}
      <nav className="flex mb-6 text-sm items-center">
        <Link 
          href={`/folders${includeSubfolders ? '?includeSubfolders=true' : ''}`} 
          className="flex items-center hover:text-primary"
        >
          <CubeIcon className="mr-1" />
          Root
        </Link>
        {breadcrumbs.map((crumb, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <div key={i} className="flex items-center">
            <ChevronRightIcon className="mx-2" />
            <Link
              href={`/folders?path=${encodeURIComponent(crumb.path)}${includeSubfolders ? '&includeSubfolders=true' : ''}`}
              className="hover:text-primary"
            >
              {crumb.name}
            </Link>
          </div>
        ))}
      </nav>

      <div className="grid md:grid-cols-4 gap-8">
        {/* Folder tree sidebar */}
        <div className="border rounded-md p-4 bg-card">
          <h2 className="text-lg font-semibold mb-4">Folders</h2>
          <Suspense fallback={<div>Loading folders...</div>}>
            {folderStructure && (
              <FolderTree
                structure={folderStructure}
                selectedPath={selectedPath}
              />
            )}
          </Suspense>
        </div>

        {/* Media items grid */}
        <div className="md:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedPath === '/'
                  ? 'Root Directory'
                  : pathParts[pathParts.length - 1]}
              </h2>
              <p className="text-muted-foreground text-sm">
                {pagination?.total} items{' '}
                {includeSubfolders
                  ? 'in this folder and subfolders'
                  : 'in this folder'}
              </p>
            </div>

            {/* Add the folder view toggle */}
            <FolderViewToggle
              includeSubfolders={includeSubfolders}
              baseUrl={basePath}
            />
          </div>

          <Suspense fallback={<div>Loading media...</div>}>
            <MediaList items={mediaItems || []} />

            {/* Pagination controls */}
            {pagination && pagination.pageCount > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.pageCount}
                  baseUrl={`${basePath}&includeSubfolders=${includeSubfolders}&page=`}
                />
              </div>
            )}

            {mediaItems && mediaItems.length === 0 && (
              <div className="text-center p-8 border rounded-md bg-muted">
                No media items in{' '}
                {includeSubfolders
                  ? 'this folder or its subfolders'
                  : 'this folder'}
                .
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

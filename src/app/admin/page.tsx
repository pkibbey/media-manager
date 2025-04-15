import AddFolderForm from '@/components/admin/add-folder-form';
import FileTypeManager from '@/components/admin/file-type-manager';
import FolderList from '@/components/admin/folder-list';
import MediaStats from '@/components/admin/media-stats';
import ScanFoldersTrigger from '@/components/admin/scan-folders-trigger';
import { Suspense } from 'react';
import { getFileTypes } from '../api/actions/file-types';
import { getScanFolders } from '../api/actions/scan-folders';
import { getMediaStats } from '../api/actions/stats';

export default async function AdminPage() {
  const {
    success: foldersSuccess,
    data: folders,
    error: foldersError,
  } = await getScanFolders();
  const {
    success: fileTypesSuccess,
    data: fileTypes,
    error: fileTypesError,
  } = await getFileTypes();
  const {
    success: statsSuccess,
    data: mediaStats,
    error: statsError,
  } = await getMediaStats();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <div className="grid gap-8">
        {/* Media Statistics */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Media Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your media collection and processing status.
          </p>
          <Suspense fallback={<div>Loading statistics...</div>}>
            {statsSuccess && mediaStats ? (
              <MediaStats stats={mediaStats} />
            ) : (
              <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                Error loading statistics: {statsError}
              </div>
            )}
          </Suspense>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Scan Folders</h2>
          <p className="text-muted-foreground">
            Configure folders to scan for media files. These folders will be
            scanned when you run a scan operation.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <AddFolderForm />
            </div>
            <div>
              <Suspense fallback={<div>Loading folders...</div>}>
                {foldersSuccess ? (
                  <FolderList folders={folders || []} />
                ) : (
                  <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                    Error loading folders: {foldersError}
                  </div>
                )}
              </Suspense>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Actions</h2>
          <p className="text-muted-foreground">
            Run operations on your media collection.
          </p>
          <div className="flex flex-col gap-4">
            <ScanFoldersTrigger />
            {/* More actions will be added here in the future */}
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">File Type Management</h2>
          <p className="text-muted-foreground">
            Manage which file types are processed and how they are displayed.
            Mark specific types to be ignored during scanning.
          </p>
          <Suspense fallback={<div>Loading file types...</div>}>
            {fileTypesSuccess ? (
              <FileTypeManager fileTypes={fileTypes || []} />
            ) : (
              <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                Error loading file types: {fileTypesError}
              </div>
            )}
          </Suspense>
        </section>
      </div>
    </div>
  );
}

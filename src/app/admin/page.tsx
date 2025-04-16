import AddFolderForm from '@/components/admin/add-folder-form';
import ExifProcessor from '@/components/admin/exif-processor';
import FileTypeManager from '@/components/admin/file-type-manager';
import FolderList from '@/components/admin/folder-list';
import MediaStats from '@/components/admin/media-stats';
import PersistentTabs from '@/components/admin/persistent-tabs';
import ResetMedia from '@/components/admin/reset-media';
import ResetScan from '@/components/admin/reset-scan';
import ResetThumbnails from '@/components/admin/reset-thumbnails';
import ScanFoldersTrigger from '@/components/admin/scan-folders-trigger';
import ThumbnailGenerator from '@/components/admin/thumbnail-generator';
import TimestampCorrector from '@/components/admin/timestamp-corrector';
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

  const tabOptions = [
    {
      value: 'folders',
      label: 'Folders',
      content: (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <AddFolderForm />
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
      ),
    },
    {
      value: 'processing',
      label: 'Processing',
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] gap-4">
            <ScanFoldersTrigger />
            <ResetScan />
          </div>
          <div className="border-t pt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] gap-4">
              <ExifProcessor />
              <ResetMedia />
            </div>
          </div>
          <div className="border-t pt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] gap-4">
              <ThumbnailGenerator />
              <ResetThumbnails />
            </div>
          </div>
          <div className="border-t pt-6">
            <TimestampCorrector />
          </div>
        </div>
      ),
    },
    {
      value: 'file-types',
      label: 'File Types',
      content: (
        <div className="space-y-4">
          <Suspense fallback={<div>Loading file types...</div>}>
            {fileTypesSuccess ? (
              <FileTypeManager fileTypes={fileTypes || []} />
            ) : (
              <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                Error loading file types: {fileTypesError}
              </div>
            )}
          </Suspense>
        </div>
      ),
    },
    {
      value: 'stats',
      label: 'Stats',
      content: (
        <div className="space-y-4">
          <Suspense fallback={<div>Loading statistics...</div>}>
            {statsSuccess && mediaStats ? (
              <MediaStats stats={mediaStats} />
            ) : (
              <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                Error loading statistics: {statsError}
              </div>
            )}
          </Suspense>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <PersistentTabs
        defaultValue="folders"
        tabOptions={tabOptions}
        className="space-y-4"
      />
    </div>
  );
}

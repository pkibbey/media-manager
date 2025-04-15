import AddFolderForm from '@/components/admin/add-folder-form';
import ExifProcessor from '@/components/admin/exif-processor';
import FileTypeManager from '@/components/admin/file-type-manager';
import FolderList from '@/components/admin/folder-list';
import MediaStats from '@/components/admin/media-stats';
import ScanFoldersTrigger from '@/components/admin/scan-folders-trigger';
import TimestampCorrector from '@/components/admin/timestamp-corrector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="folders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="folders">Folders</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="file-types">File Types</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="folders" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="processing" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <ScanFoldersTrigger />
            <ExifProcessor />
          </div>
          <div className="border-t pt-6">
            <TimestampCorrector />
          </div>
        </TabsContent>

        <TabsContent value="file-types" className="space-y-4">
          <Suspense fallback={<div>Loading file types...</div>}>
            {fileTypesSuccess ? (
              <FileTypeManager fileTypes={fileTypes || []} />
            ) : (
              <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                Error loading file types: {fileTypesError}
              </div>
            )}
          </Suspense>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Suspense fallback={<div>Loading statistics...</div>}>
            {statsSuccess && mediaStats ? (
              <MediaStats stats={mediaStats} />
            ) : (
              <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                Error loading statistics: {statsError}
              </div>
            )}
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

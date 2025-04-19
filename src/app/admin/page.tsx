import AddFolderForm from '@/components/admin/add-folder-form';
import DetectionAnalyzer from '@/components/admin/detection-analyzer';
import ExifProcessor from '@/components/admin/exif-processor';
import FileTypeManager from '@/components/admin/file-type-manager';
import FolderList from '@/components/admin/folder-list';
import MediaStats from '@/components/admin/media-stats';
import PersistentTabs from '@/components/admin/persistent-tabs';
import ResetDetection from '@/components/admin/reset-detection';
import ResetMedia from '@/components/admin/reset-media';
import ResetScan from '@/components/admin/reset-scan';
import ResetThumbnails from '@/components/admin/reset-thumbnails';
import ResetTimestamps from '@/components/admin/reset-timestamps';
import ScanFoldersTrigger from '@/components/admin/scan-folders-trigger';
import ThumbnailGenerator from '@/components/admin/thumbnail-generator';
import { TimestampCorrectorWrapper } from '@/components/admin/timestamp-corrector-wrapper';
import { Suspense } from 'react';
import { getFileTypes } from '../actions/file-types';

export default async function AdminPage() {
  // We only need to fetch file types now, as other data is fetched by the server components
  const {
    success: fileTypesSuccess,
    data: fileTypes,
    error: fileTypesError,
  } = await getFileTypes();

  const tabOptions = [
    {
      value: 'folders',
      label: 'Folders',
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
            <ScanFoldersTrigger />
            <ResetScan />
          </div>
          <div className="border-t pt-6 grid md:grid-cols-2 lg:grid-cols-[1fr_2fr] items-start gap-6">
            <AddFolderForm />
            <Suspense fallback={<div>Loading folders...</div>}>
              {/* FolderList now fetches its own data */}
              <FolderList />
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
          <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
            <ExifProcessor />
            <ResetMedia />
          </div>
        </div>
      ),
    },
    {
      value: 'detection',
      label: 'Detection',
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
            <DetectionAnalyzer />
            <ResetDetection />
          </div>
        </div>
      ),
    },
    {
      value: 'thumbnails',
      label: 'Thumbnails',
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
            <ThumbnailGenerator />
            <ResetThumbnails />
          </div>
        </div>
      ),
    },
    {
      value: 'timestamps',
      label: 'Timestamps',
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
            <Suspense fallback={<div>Loading timestamp corrector...</div>}>
              <TimestampCorrectorWrapper />
            </Suspense>
            <ResetTimestamps />
          </div>
        </div>
      ),
    },
    {
      value: 'file-types',
      label: 'File Types',
      content: (
        <div className="space-y-6">
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
        <div className="space-y-6">
          <Suspense fallback={<div>Loading statistics...</div>}>
            {/* MediaStats now fetches its own data */}
            <MediaStats />
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
        className="space-y-4 gap-6"
      />
    </div>
  );
}

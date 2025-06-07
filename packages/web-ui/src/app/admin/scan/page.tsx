'use client';

import { deleteAllMediaItems } from '@/actions/admin/delete-all-media';
import { getMediaScanPaths } from '@/actions/admin/get-media-scan-paths';
import { getScanStats } from '@/actions/admin/get-scan-stats';
import { addFoldersToScanQueue } from '@/actions/folder-scan/add-folder-scan-to-queue';
import { ActionButton } from '@/components/admin/action-button';
import { FolderScanQueueStatus } from '@/components/admin/folder-scan-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { StatsCard } from '@/components/admin/stats-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {} from '@/components/ui/tabs';
import { FolderSearch, Scan, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MediaScanPage() {
  const [scanStats, setScanStats] = useState<any>(null);
  const [folderPaths, setFolderPaths] = useState<string>('');

  // Fetch scan stats and media paths on page load (one-time or slow refresh)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [response, mediaPaths] = await Promise.all([
          getScanStats(),
          getMediaScanPaths(),
        ]);

        if (response.stats) {
          setScanStats(response.stats);
        }
        setFolderPaths(mediaPaths);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();

    // Only refresh stats periodically (not the input paths)
    const interval = setInterval(async () => {
      try {
        const response = await getScanStats();
        if (response.stats) {
          setScanStats(response.stats);
        }
      } catch (error) {
        console.error('Error fetching scan stats:', error);
      }
    }, 5000); // Every 5 seconds for database stats

    return () => clearInterval(interval);
  }, []);

  // Scan folders and add to queue
  const scanFolders = async () => {
    // Split input by comma, trim, and filter out empty strings
    const paths = folderPaths
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paths.length === 0) {
      return false;
    }

    try {
      const result = await addFoldersToScanQueue(paths);

      if (result.success) {
        console.log(
          `Successfully added ${result.foldersAdded} folders to scan queue`,
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error adding folders to scan queue:', error);
      return false;
    }
  };

  const handleDeleteAllMedia = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL media items? This action cannot be undone and will remove all media files and their associated data from the database.',
    );

    if (confirmed) {
      return await deleteAllMediaItems();
    }

    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Media Scanner</h2>
          <p className="text-muted-foreground">
            Scan directories and import new media files
          </p>
        </div>
        <PauseQueueButton queueName="folderScanQueue" />
      </div>

      <StatsCard
        title="Media Library Status"
        total={scanStats?.total || 0}
        processed={scanStats?.processed || 0}
        icon={<FolderSearch className="h-4 w-4" />}
        className="w-full"
      />

      <FolderScanQueueStatus />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scan Configuration</CardTitle>
          <CardDescription>
            Configure directories to scan for media files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div>
              <Input
                id="folder-path"
                placeholder="/path/to/media/folder, /another/path"
                value={folderPaths}
                onChange={(e) => setFolderPaths(e.target.value)}
                className={
                  folderPaths
                    .split(',')
                    .some((p) => p.trim() !== '' && !p.trim().startsWith('/'))
                    ? 'border-red-500'
                    : ''
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter one or more absolute folder paths, separated by commas
              </p>
              {folderPaths
                .split(',')
                .some((p) => p.trim() !== '' && !p.trim().startsWith('/')) && (
                <p className="text-xs text-red-500 mt-1">
                  All paths must be absolute (start with /)
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        <div className="flex flex-col gap-2 items-start">
          <ActionButton action={scanFolders}>
            <Scan className="h-4 w-4 mr-1" />
            Add to Scan Queue
          </ActionButton>
          <p className="text-muted-foreground">
            Add the configured directories to the scan queue for media file
            import.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-md font-semibold text-destructive mb-2">
            Destructive Actions
          </h4>
          <div className="flex flex-col gap-2 items-start">
            <ActionButton action={handleDeleteAllMedia} variant="destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete All Media
            </ActionButton>
            <p className="text-muted-foreground">
              This will delete all media items and their associated data from
              the database. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

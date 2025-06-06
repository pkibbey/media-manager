'use client';
import { deleteAllThumbnails } from '@/actions/thumbnails/delete-all-thumbnails';
import { getFailedThumbnailJobs } from '@/actions/thumbnails/get-failed-thumbnail-jobs';
import { ActionButton } from '@/components/admin/action-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { ThumbnailQueueStatus } from '@/components/admin/thumbnail-queue-status';
import { MediaListContainer } from '@/components/media/media-list/media-list-container';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MediaWithRelations } from 'shared/types';

export default function ThumbnailAdminPage() {
  const [failedMediaItems, setFailedMediaItems] = useState<
    MediaWithRelations[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFailedJobs = async () => {
      try {
        const items = await getFailedThumbnailJobs();
        setFailedMediaItems(items);
      } catch (error) {
        console.error('Error fetching failed thumbnail jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFailedJobs();
  }, []);

  const handleDeleteAllThumbnails = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL thumbnails? This action cannot be undone and will remove all thumbnail references from the database.',
    );

    if (confirmed) {
      return await deleteAllThumbnails();
    }

    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Thumbnail Management</h2>
          <p className="text-muted-foreground">
            Manage generation and updates of image thumbnails
          </p>
        </div>
        <PauseQueueButton queueName="thumbnailQueue" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="flex flex-col gap-2 items-start">
          <h3 className="text-xl font-semibold">Ultra Processing</h3>
          <AddToQueueButton queueName="thumbnailQueue" method="ultra" />
          <p className="text-muted-foreground">Approx. 300 images per second</p>
        </div>
        <div className="flex flex-col gap-2 items-start">
          <h3 className="text-xl font-semibold">Fast Processing</h3>
          <AddToQueueButton queueName="thumbnailQueue" method="fast" />
          <p className="text-muted-foreground">
            Quick resize generation with good quality.
          </p>
        </div>
        <div className="flex flex-col gap-2 items-start">
          <h3 className="text-xl font-semibold">Slow Processing</h3>
          <AddToQueueButton queueName="thumbnailQueue" method="slow" />
          <p className="text-muted-foreground">
            High quality generation for best results.
          </p>
        </div>
      </div>

      <ThumbnailQueueStatus />

      {!loading && failedMediaItems.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              Failed Thumbnail Generation
            </h3>
            <p className="text-muted-foreground">
              Media items that failed thumbnail generation (
              {failedMediaItems.length} items)
            </p>
          </div>
          <MediaListContainer
            media={failedMediaItems}
            totalCount={failedMediaItems.length}
          />
        </div>
      )}

      {!loading && failedMediaItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No failed thumbnail generation jobs found.</p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Destructive Actions</h3>
        <ActionButton variant="destructive" action={handleDeleteAllThumbnails}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete All Thumbnails
        </ActionButton>
        <p className="text-muted-foreground">
          This will delete all thumbnail references from the database. This
          action cannot be undone.
        </p>
      </div>
    </div>
  );
}

'use client';
import { getFailedThumbnailJobs } from '@/actions/thumbnails/get-failed-thumbnail-jobs';
import { ActionButton } from '@/components/admin/action-button';
import { AddOneToQueueButton } from '@/components/admin/add-one-to-queue-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { ThumbnailProcessingCountsDisplay } from '@/components/admin/thumbnail-processing-counts-display';
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

    if (!confirmed) {
      return false;
    }

    try {
      console.log('🔥 Initiating thumbnail deletion request...');

      const response = await fetch('/api/admin/delete-all-thumbnails', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Thumbnail deletion process started successfully');
        console.log(
          '📋 Note: The deletion is running in the background. Check server logs for progress.',
        );
        // You could add a toast notification here if you have a toast system
        return true;
      }

      console.error('❌ Failed to start thumbnail deletion:', data.error);
      return false;
    } catch (error) {
      console.error('💥 Error calling delete API:', error);
      return false;
    }
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

      <ThumbnailQueueStatus />

      <ThumbnailProcessingCountsDisplay />

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
          <MediaListContainer media={failedMediaItems} />
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        <div className="flex flex-col gap-2 items-start">
          <div className="flex gap-2">
            <AddToQueueButton queueName="thumbnailQueue" method="ultra" />
            <AddOneToQueueButton queueName="thumbnailQueue" method="ultra" />
          </div>
          <p className="text-muted-foreground">
            This will add all the thumbnails to be processed
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-md font-semibold text-destructive mb-2">
            Destructive Actions
          </h4>
          <div className="flex flex-col gap-2 items-start">
            <ActionButton
              variant="destructive"
              action={handleDeleteAllThumbnails}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete All Thumbnails
            </ActionButton>
            <p className="text-muted-foreground">
              This will delete all thumbnail references from the database. This
              action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

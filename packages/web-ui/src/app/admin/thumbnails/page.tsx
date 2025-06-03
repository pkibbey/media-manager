'use client';

import { deleteThumbnailData } from '@/actions/thumbnails/delete-thumbnail-data';
import { addRemainingToThumbnailsQueue } from '@/actions/thumbnails/process-thumbnail';
import { ActionButton } from '@/components/admin/action-button';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { ThumbnailQueueStatus } from '@/components/admin/thumbnail-queue-status';

export default function ThumbnailAdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Thumbnail Management</h2>
          <p className="text-muted-foreground">
            Manage generation and updates of media thumbnails
          </p>
        </div>

        <div className="flex gap-4">
          <ActionButton
            action={addRemainingToThumbnailsQueue}
            loadingMessage="Processing thumbnails..."
          >
            Add Thumbnails to Queue
          </ActionButton>
          <PauseQueueButton queueName="thumbnailQueue" />
          <ActionButton
            action={deleteThumbnailData}
            variant="destructive"
            loadingMessage="Resetting thumbnail data..."
          >
            Delete Data
          </ActionButton>
        </div>

        <ThumbnailQueueStatus />
      </div>
    </AdminLayout>
  );
}

'use client';

import { deleteAllThumbnails } from '@/actions/thumbnails/delete-all-thumbnails';
import { ActionButton } from '@/components/admin/action-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { ThumbnailQueueStatus } from '@/components/admin/thumbnail-queue-status';
import { Trash2 } from 'lucide-react';

export default function ThumbnailAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Thumbnail Management</h2>
        <p className="text-muted-foreground">
          Manage generation and updates of image thumbnails
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="thumbnailQueue" method="ultra" />
        <AddToQueueButton queueName="thumbnailQueue" method="fast" />
        <AddToQueueButton queueName="thumbnailQueue" method="slow" />
        <PauseQueueButton queueName="thumbnailQueue" />
        <ActionButton
          action={deleteAllThumbnails}
          variant="destructive"
          loadingMessage="Deleting all thumbnails..."
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete All Thumbnails
        </ActionButton>
      </div>

      <ThumbnailQueueStatus />
    </div>
  );
}

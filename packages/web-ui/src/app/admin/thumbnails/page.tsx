'use client';

import { deleteAllThumbnails } from '@/actions/thumbnails/delete-all-thumbnails';
import { ActionButton } from '@/components/admin/action-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';
import { ThumbnailQueueStatus } from '@/components/admin/thumbnail-queue-status';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2 } from 'lucide-react';

export default function ThumbnailAdminPage() {
  return (
    <div className="space-y-6">
      <Alert className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-3 rounded mb-4">
        <AlertTitle>Note</AlertTitle>
        <AlertDescription>
          Only image files are processed for thumbnails. Other media types are
          ignored.
        </AlertDescription>
      </Alert>

      <div>
        <h2 className="text-2xl font-bold">Thumbnail Management</h2>
        <p className="text-muted-foreground">
          Manage generation and updates of image thumbnails
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="thumbnailQueue" />
        <PauseQueueButton queueName="thumbnailQueue" />
        <ActionButton
          action={deleteAllThumbnails}
          variant="destructive"
          loadingMessage="Deleting all media items..."
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete All Thumbnails
        </ActionButton>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Queue State Management</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Reset specific queue states individually (waiting, completed, failed,
          etc.)
        </p>
        <QueueResetButton queueName="thumbnailQueue" />
      </div>

      <ThumbnailQueueStatus />
    </div>
  );
}

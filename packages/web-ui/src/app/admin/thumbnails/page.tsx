'use client';

import { deleteThumbnailData } from '@/actions/thumbnails/delete-thumbnail-data';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';
import { ResetDataButton } from '@/components/admin/reset-data-button';
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

        <div className="flex gap-4 flex-wrap">
          <AddToQueueButton queueName="thumbnailQueue" />
          <PauseQueueButton queueName="thumbnailQueue" />
          <ResetDataButton action={deleteThumbnailData} />
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Queue State Management</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Reset specific queue states individually (waiting, completed,
            failed, etc.)
          </p>
          <QueueResetButton queueName="thumbnailQueue" />
        </div>

        <ThumbnailQueueStatus />
      </div>
    </AdminLayout>
  );
}

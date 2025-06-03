'use client';

import { addContentWarningsToQueue } from '@/actions/content-warnings/add-content-warnings-to-queue';
import { resetContentWarningsData } from '@/actions/content-warnings/reset-content-warnings-data';
import { ActionButton } from '@/components/admin/action-button';
import { ContentWarningsQueueStatus } from '@/components/admin/content-warnings-queue-status';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';

export default function ContentWarningsAdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Content Warnings Management</h2>
          <p className="text-muted-foreground">
            Manage detection and handling of sensitive content in media
          </p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <ActionButton
            action={addContentWarningsToQueue}
            loadingMessage="Processing content warnings..."
          >
            Add all to Queue
          </ActionButton>
          <PauseQueueButton queueName="contentWarningsQueue" />
          <ActionButton
            action={resetContentWarningsData}
            variant="destructive"
            loadingMessage="Resetting content warnings data..."
          >
            Reset Data
          </ActionButton>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Queue State Management</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Reset specific queue states individually (waiting, completed,
            failed, etc.)
          </p>
          <QueueResetButton queueName="contentWarningsQueue" />
        </div>

        <ContentWarningsQueueStatus />
      </div>
    </AdminLayout>
  );
}

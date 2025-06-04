'use client';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';
import { ContentWarningsQueueStatus } from '@/components/admin/warnings-queue-status';

export default function ContentWarningsAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content Warnings Management</h2>
        <p className="text-muted-foreground">
          Manage detection and handling of sensitive content in media
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="contentWarningsQueue" />
        <PauseQueueButton queueName="contentWarningsQueue" />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Queue State Management</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Reset specific queue states individually (waiting, completed, failed,
          etc.)
        </p>
        <QueueResetButton queueName="contentWarningsQueue" />
      </div>

      <ContentWarningsQueueStatus />
    </div>
  );
}

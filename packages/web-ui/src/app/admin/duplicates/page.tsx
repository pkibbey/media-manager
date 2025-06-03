'use client';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { DuplicatesQueueStatus } from '@/components/admin/duplicates-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';

export default function DuplicatesAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Duplicate Detection</h2>
        <p className="text-muted-foreground">
          Manage and process duplicate images using a queue system.
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="duplicatesQueue" />
        <PauseQueueButton queueName="duplicatesQueue" />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Queue State Management</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Reset specific queue states individually (waiting, completed, failed,
          etc.)
        </p>
        <QueueResetButton queueName="duplicatesQueue" />
      </div>

      <DuplicatesQueueStatus />
    </div>
  );
}

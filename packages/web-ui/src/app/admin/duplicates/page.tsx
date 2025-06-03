'use client';

import { resetDuplicatesData } from '@/actions/duplicates/reset-duplicates-data';
import { ActionButton } from '@/components/admin/action-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { DuplicatesQueueStatus } from '@/components/admin/duplicates-queue-status';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';

export default function DuplicatesAdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Duplicate Detection</h2>
          <p className="text-muted-foreground">
            Manage and process duplicate images using a queue system.
          </p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <AddToQueueButton
            queueName="duplicatesQueue"
            displayName="Add Duplicates to Queue"
          />
          <PauseQueueButton queueName="duplicatesQueue" />
          <ActionButton
            action={resetDuplicatesData}
            variant="destructive"
            loadingMessage="Resetting duplicates data..."
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
          <QueueResetButton queueName="duplicatesQueue" />
        </div>

        <DuplicatesQueueStatus />
      </div>
    </AdminLayout>
  );
}

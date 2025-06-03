'use client';

import { addRemainingToDuplicatesQueue } from '@/actions/duplicates/add-duplicates-to-queue';
import { resetDuplicatesData } from '@/actions/duplicates/reset-duplicates-data';
import { ActionButton } from '@/components/admin/action-button';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

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

        <div className="flex gap-4">
          <ActionButton
            action={addRemainingToDuplicatesQueue}
            loadingMessage="Adding items to queue..."
          >
            Process All Remaining
          </ActionButton>
          <PauseQueueButton queueName="duplicatesQueue" />
          <ActionButton
            action={resetDuplicatesData}
            variant="destructive"
            loadingMessage="Resetting duplicates data..."
          >
            Reset Data
          </ActionButton>
        </div>
      </div>
    </AdminLayout>
  );
}

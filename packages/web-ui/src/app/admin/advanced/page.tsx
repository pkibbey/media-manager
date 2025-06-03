'use client';

import { addAdvancedToQueue } from '@/actions/advanced/add-advanced-to-queue';
import { resetAdvancedData } from '@/actions/advanced/reset-advanced-data';

import { ActionButton } from '@/components/admin/action-button';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function AdvancedAnalysisAdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Advanced AI Analysis</h2>
          <p className="text-muted-foreground">
            Manage deep understanding of media content
          </p>
        </div>

        <div className="flex gap-4">
          <ActionButton
            action={addAdvancedToQueue}
            loadingMessage="Processing analysis data..."
          >
            Process All Remaining
          </ActionButton>
          <PauseQueueButton queueName="advancedAnalysisQueue" />
          <ActionButton
            action={resetAdvancedData}
            variant="destructive"
            loadingMessage="Resetting analysis data..."
          >
            Reset Data
          </ActionButton>
        </div>
      </div>
    </AdminLayout>
  );
}

'use client';

import { addBasicToQueue } from '@/actions/basic/add-basic-to-queue';
import { resetBasicData } from '@/actions/basic/reset-basic-data';
import { ActionButton } from '@/components/admin/action-button';
import { AdminLayout } from '@/components/admin/layout';
import { ObjectAnalysisQueueStatus } from '@/components/admin/object-analysis-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';

export default function BasicAnalysisAdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Object Analysis Management</h2>
          <p className="text-muted-foreground">
            Manage AI-powered image analysis and content understanding
          </p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <ActionButton
            action={addBasicToQueue}
            loadingMessage="Processing analysis data..."
          >
            Add Object Analysis to Queue
          </ActionButton>
          <PauseQueueButton queueName="objectAnalysisQueue" />
          <ActionButton
            action={resetBasicData}
            variant="destructive"
            loadingMessage="Resetting analysis data..."
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
          <QueueResetButton queueName="objectAnalysisQueue" />
        </div>

        <ObjectAnalysisQueueStatus />
      </div>
    </AdminLayout>
  );
}

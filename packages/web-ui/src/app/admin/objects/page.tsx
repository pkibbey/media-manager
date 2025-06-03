'use client';

import { resetBasicData } from '@/actions/basic/reset-basic-data';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { AdminLayout } from '@/components/admin/layout';
import { ObjectAnalysisQueueStatus } from '@/components/admin/object-analysis-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';
import { ResetDataButton } from '@/components/admin/reset-data-button';

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
          <AddToQueueButton queueName="objectAnalysisQueue" />
          <PauseQueueButton queueName="objectAnalysisQueue" />
          <ResetDataButton action={resetBasicData} />
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

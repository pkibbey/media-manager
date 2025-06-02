'use client';

import { addBasicToQueue } from '@/actions/basic/add-basic-to-queue';
import { resetBasicData } from '@/actions/basic/reset-basic-data';
import { ActionButton } from '@/components/admin/action-button';
import { AnalysisCountsCard } from '@/components/admin/analysis-counts-card';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

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

        <AnalysisCountsCard queueName="objectAnalysisQueue" />

        <div className="flex gap-4">
          <ActionButton
            action={addBasicToQueue}
            loadingMessage="Processing analysis data..."
          >
            Process All Remaining
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
      </div>
    </AdminLayout>
  );
}

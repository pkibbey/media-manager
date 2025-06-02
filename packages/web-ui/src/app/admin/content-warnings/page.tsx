'use client';

import { addContentWarningsToQueue } from '@/actions/content-warnings/add-content-warnings-to-queue';
import { resetContentWarningsData } from '@/actions/content-warnings/reset-content-warnings-data';
import { ActionButton } from '@/components/admin/action-button';
import { AnalysisCountsCard } from '@/components/admin/analysis-counts-card';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

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

        <AnalysisCountsCard queueName="contentWarningsQueue" />

        <div className="flex gap-4">
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
      </div>
    </AdminLayout>
  );
}

'use client';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { ObjectAnalysisQueueStatus } from '@/components/admin/object-analysis-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function BasicAnalysisAdminPage() {
  return (
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
      </div>

      <ObjectAnalysisQueueStatus />
    </div>
  );
}

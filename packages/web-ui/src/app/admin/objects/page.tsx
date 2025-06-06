'use client';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { ObjectAnalysisQueueStatus } from '@/components/admin/object-analysis-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function BasicAnalysisAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Object Analysis Management</h2>
          <p className="text-muted-foreground">
            Manage AI-powered image analysis and content understanding
          </p>
        </div>
        <PauseQueueButton queueName="objectAnalysisQueue" />
      </div>

      <div className="flex flex-col gap-2 items-start">
        <h3 className="text-xl font-semibold">Standard Processing</h3>
        <AddToQueueButton queueName="objectAnalysisQueue" method="standard" />
        <p className="text-muted-foreground">
          Analyze images to detect and identify objects, people, and scenes.
        </p>
      </div>

      <ObjectAnalysisQueueStatus />
    </div>
  );
}

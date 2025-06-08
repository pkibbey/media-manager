'use client';
import { AddOneToQueueButton } from '@/components/admin/add-one-to-queue-button';
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

      <ObjectAnalysisQueueStatus />

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        <div className="flex flex-col gap-2 items-start">
          <div className="flex gap-2">
            <AddToQueueButton
              queueName="objectAnalysisQueue"
              method="standard"
            />
            <AddOneToQueueButton
              queueName="objectAnalysisQueue"
              method="standard"
            />
          </div>
          <p className="text-muted-foreground">
            Analyze images to detect and identify objects, people, and scenes.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { AdvancedAnalysisQueueStatus } from '@/components/admin/advanced-analysis-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function AdvancedAnalysisAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Advanced AI Analysis</h2>
        <p className="text-muted-foreground">
          Manage deep understanding of media content
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="advancedAnalysisQueue" method="ollama" />
        <PauseQueueButton queueName="advancedAnalysisQueue" />
      </div>

      <AdvancedAnalysisQueueStatus />
    </div>
  );
}

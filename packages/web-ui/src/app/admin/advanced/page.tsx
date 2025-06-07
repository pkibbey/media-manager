'use client';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { AdvancedAnalysisQueueStatus } from '@/components/admin/advanced-analysis-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function AdvancedAnalysisAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Advanced AI Analysis</h2>
          <p className="text-muted-foreground">
            Manage deep understanding of media content
          </p>
        </div>
        <PauseQueueButton queueName="advancedAnalysisQueue" />
      </div>

      <AdvancedAnalysisQueueStatus />

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        <div className="flex flex-col gap-2 items-start">
          <AddToQueueButton queueName="advancedAnalysisQueue" method="ollama" />
          <p className="text-muted-foreground">
            Deep AI analysis using Ollama for comprehensive content
            understanding.
          </p>
        </div>
      </div>
    </div>
  );
}

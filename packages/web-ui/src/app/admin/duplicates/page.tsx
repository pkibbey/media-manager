'use client';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';
import { DuplicatesQueueStatus } from '@/components/admin/duplicates-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function DuplicatesAdminPage() {
  const duplicatesColumns = [
    'duplicate_id',
    'hamming_distance',
    'media_id',
    'similarity_score',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Duplicate Detection</h2>
        <p className="text-muted-foreground">
          Manage and process duplicate images using a queue system.
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="duplicatesQueue" />
        <PauseQueueButton queueName="duplicatesQueue" />
      </div>

      <DuplicatesQueueStatus />

      <DatabaseColumnAnalysis
        table="duplicates"
        columns={duplicatesColumns}
        title="Duplicates Table Column Analysis"
        description="Analysis of nullable columns in the duplicates table to identify unused or fully null columns"
      />
    </div>
  );
}

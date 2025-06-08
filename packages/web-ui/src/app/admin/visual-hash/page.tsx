'use client';
import { deleteAllVisualHashes } from '@/actions/visual-hash/delete-all-visual-hashes';
import { ActionButton } from '@/components/admin/action-button';
import { AddOneToQueueButton } from '@/components/admin/add-one-to-queue-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { VisualHashQueueStatus } from '@/components/admin/visual-hash-queue-status';
import { getTableColumns } from '@/lib/database-columns';
import { Hash, Trash2 } from 'lucide-react';

export default function VisualHashAdminPage() {
  const handleDeleteAllVisualHashes = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL visual hashes? This action cannot be undone and will remove all visual hash data from the database, affecting duplicate detection.',
    );

    if (confirmed) {
      return await deleteAllVisualHashes();
    }

    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Visual Hash Management</h2>
          <p className="text-muted-foreground">
            Manage generation of visual hashes for duplicate detection
          </p>
        </div>
        <PauseQueueButton queueName="visualHashQueue" />
      </div>

      <VisualHashQueueStatus />

      <DatabaseColumnAnalysis
        table="media"
        columns={getTableColumns.media()}
        title="Visual Hash Coverage"
        description="Analysis of visual hash data in media table"
      />

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        <div className="flex flex-col gap-2 items-start">
          <div className="flex gap-2">
            <AddToQueueButton
              queueName="visualHashQueue"
              method="standard"
              icon={Hash}
            />
            <AddOneToQueueButton
              queueName="visualHashQueue"
              method="standard"
              icon={Hash}
            />
          </div>
          <p className="text-muted-foreground">
            Generate visual hashes for all images that have thumbnails but no
            visual hash
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-md font-semibold text-destructive mb-2">
            Destructive Actions
          </h4>
          <div className="flex flex-col gap-2 items-start">
            <ActionButton
              variant="destructive"
              action={handleDeleteAllVisualHashes}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete All Visual Hashes
            </ActionButton>
            <p className="text-muted-foreground">
              This will delete all visual hash data from the database. This
              action cannot be undone and will affect duplicate detection until
              visual hashes are regenerated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

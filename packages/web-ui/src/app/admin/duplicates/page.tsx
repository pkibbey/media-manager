'use client';
import { ActionButton } from '@/components/admin/action-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { DuplicatesQueueStatus } from '@/components/admin/duplicates-queue-status';
import { DuplicatesViewer } from '@/components/admin/duplicates-viewer';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { Trash2 } from 'lucide-react';

export default function DuplicatesAdminPage() {
  const handleDeleteAutomatically = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to automatically delete duplicate files? This action cannot be undone and will permanently remove files that match deletion rules.',
    );

    if (confirmed) {
      try {
        const response = await fetch(
          '/api/admin/add-to-queue?queueName=duplicatesQueue&method=auto-delete',
          {
            method: 'POST',
          },
        );

        const result = await response.json();

        if (response.ok) {
          console.log('Delete identical duplicates job added to queue');
          return true;
        }

        console.error('Error adding delete identical job:', result.error);
        return false;
      } catch (error) {
        console.error('Failed to add delete identical job:', error);
        return false;
      }
    }

    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Duplicate Detection</h2>
          <p className="text-muted-foreground">
            Manage and process duplicate images using a queue system.
          </p>
        </div>
        <PauseQueueButton queueName="duplicatesQueue" />
      </div>

      <DuplicatesQueueStatus />

      <DuplicatesViewer />

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        <div className="flex flex-col gap-2 items-start">
          <AddToQueueButton queueName="duplicatesQueue" method="standard" />
          <p className="text-muted-foreground">
            This will add all media items to the duplicates queue for
            processing. It will only check for duplicates without deleting any
            files. Useful for initial scans or manual review.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-md font-semibold text-destructive mb-2">
            Destructive Actions
          </h4>
          <div className="flex flex-col gap-2 items-start">
            <ActionButton
              variant="destructive"
              action={handleDeleteAutomatically}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Duplicates Automatically
            </ActionButton>
            <p className="text-muted-foreground">
              This will automatically delete duplicate files based on predefined
              rules. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

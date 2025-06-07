'use client';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { ContentWarningsQueueStatus } from '@/components/admin/warnings-queue-status';

export default function ContentWarningsAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Warnings Management</h2>
          <p className="text-muted-foreground">
            Manage detection and handling of sensitive content in media
          </p>
        </div>
        <PauseQueueButton queueName="contentWarningsQueue" />
      </div>

      <ContentWarningsQueueStatus />

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        <div className="flex flex-col gap-2 items-start">
          <AddToQueueButton
            queueName="contentWarningsQueue"
            method="standard"
          />
          <p className="text-muted-foreground">
            Analyze media files to detect and categorize potentially sensitive
            content. This helps ensure appropriate content warnings are applied.
          </p>
        </div>
      </div>
    </div>
  );
}

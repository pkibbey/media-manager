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

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Processing</h3>
        <p className="text-muted-foreground">
          Analyze media files to detect and categorize potentially sensitive
          content. This helps ensure appropriate content warnings are applied.
        </p>
        <AddToQueueButton queueName="contentWarningsQueue" method="standard" />
      </div>

      <ContentWarningsQueueStatus />
    </div>
  );
}

'use client';

import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { FixImageDatesQueueStatus } from '@/components/admin/fix-image-dates-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function FixDatesAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Fix Image Dates</h2>
        <p className="text-muted-foreground">
          Find images without EXIF date data and attempt to fix them using
          filename parsing.
        </p>
      </div>

      {/* Queue Management Section */}
      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <AddToQueueButton queueName="fixImageDatesQueue" />
          <PauseQueueButton queueName="fixImageDatesQueue" />
        </div>

        <FixImageDatesQueueStatus />
      </div>
    </div>
  );
}

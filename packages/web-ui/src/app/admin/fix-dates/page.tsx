'use client';

import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { FixImageDatesQueueStatus } from '@/components/admin/fix-image-dates-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function FixDatesAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Fix Image Dates</h2>
          <p className="text-muted-foreground">
            Find images without EXIF date data and attempt to fix them using
            filename parsing.
          </p>
        </div>
        <PauseQueueButton queueName="fixImageDatesQueue" />
      </div>

      <div className="flex flex-col gap-2 items-start">
        <h3 className="text-xl font-semibold">Standard Processing</h3>
        <AddToQueueButton queueName="fixImageDatesQueue" method="standard" />
        <p className="text-muted-foreground">
          Parse dates from filenames and update EXIF timestamps for images
          missing date metadata.
        </p>
      </div>

      <FixImageDatesQueueStatus />
    </div>
  );
}

'use client';

import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { BlurryPhotosQueueStatus } from '@/components/admin/blurry-photos-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function BlurryPhotosAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Blurry Photos Detection</h2>
          <p className="text-muted-foreground">
            Detect and manage images that are all one solid color (indicating
            blank or corrupted images).
          </p>
        </div>
        <PauseQueueButton queueName="blurryPhotosQueue" />
      </div>

      <div className="flex flex-col gap-2 items-start">
        <h3 className="text-xl font-semibold">Detection Processing</h3>
        <AddToQueueButton queueName="blurryPhotosQueue" method="standard" />
        <p className="text-muted-foreground">
          Analyze images to detect blurry or corrupted content.
        </p>
      </div>

      <BlurryPhotosQueueStatus />
    </div>
  );
}

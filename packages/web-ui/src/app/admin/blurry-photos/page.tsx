'use client';

import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { BlurryPhotosQueueStatus } from '@/components/admin/blurry-photos-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function BlurryPhotosAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Blurry Photos Detection</h2>
        <p className="text-muted-foreground">
          Detect and manage images that are all one solid color (indicating
          blank or corrupted images).
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="blurryPhotosQueue" method="standard" />
        <PauseQueueButton queueName="blurryPhotosQueue" />
      </div>

      <BlurryPhotosQueueStatus />
    </div>
  );
}

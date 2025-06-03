import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { ExifQueueStatus } from '@/components/admin/exif-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';

export default function ExifAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">EXIF Analysis</h2>
        <p className="text-muted-foreground">
          Manage extraction and updates of EXIF metadata
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="exifQueue" />
        <PauseQueueButton queueName="exifQueue" />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Queue State Management</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Reset specific queue states individually (waiting, completed, failed,
          etc.)
        </p>
        <QueueResetButton queueName="exifQueue" />
      </div>

      <ExifQueueStatus />
    </div>
  );
}

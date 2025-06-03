import { resetExifData } from '@/actions/exif/reset-exif-data';
import { ActionButton } from '@/components/admin/action-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { ExifQueueStatus } from '@/components/admin/exif-queue-status';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { QueueResetButton } from '@/components/admin/queue-reset-button';

export default function ExifAdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">EXIF Analysis</h2>
          <p className="text-muted-foreground">
            Manage extraction and updates of EXIF metadata
          </p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <AddToQueueButton
            queueName="exifQueue"
            displayName="Populate EXIF Queue"
          />
          <PauseQueueButton queueName="exifQueue" />
          <ActionButton
            action={resetExifData}
            variant="destructive"
            loadingMessage="Deleting EXIF data..."
          >
            Reset Data
          </ActionButton>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Queue State Management</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Reset specific queue states individually (waiting, completed,
            failed, etc.)
          </p>
          <QueueResetButton queueName="exifQueue" />
        </div>

        <ExifQueueStatus />
      </div>
    </AdminLayout>
  );
}

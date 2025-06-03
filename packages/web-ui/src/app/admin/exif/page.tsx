import { addExifToQueue } from '@/actions/exif/add-exif-to-queue';
import { resetExifData } from '@/actions/exif/reset-exif-data';
import { ActionButton } from '@/components/admin/action-button';
import { ExifQueueStatus } from '@/components/admin/exif-queue-status';
import { AdminLayout } from '@/components/admin/layout';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

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

        <div className="flex gap-4">
          <ActionButton
            action={addExifToQueue}
            loadingMessage="Adding items to queue..."
          >
            Add Exif to Queue
          </ActionButton>
          <PauseQueueButton queueName="exifQueue" />
          <ActionButton
            action={resetExifData}
            variant="destructive"
            loadingMessage="Deleting EXIF data..."
          >
            Reset Data
          </ActionButton>
        </div>

        <ExifQueueStatus />
      </div>
    </AdminLayout>
  );
}

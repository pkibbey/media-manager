import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { ExifQueueStatus } from '@/components/admin/exif-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

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

      <ExifQueueStatus />
    </div>
  );
}

import deleteExifData from '@/actions/exif/delete-exif-data';
import { addExifToQueue } from '@/actions/exif/add-exif-to-queue';
import ActionButton from '@/components/admin/action-button';
import AnalysisCountsCard from '@/components/admin/analysis-counts-card';
import AdminLayout from '@/components/admin/layout';
import PauseQueueButton from '@/components/admin/pause-queue-button';

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

        <AnalysisCountsCard queueName="exifQueue" />

        <div className="flex gap-4">
          <ActionButton
            action={addExifToQueue}
            loadingMessage="Adding items to queue..."
          >
            Queue Exif
          </ActionButton>
          <PauseQueueButton queueName="exifQueue" />
          <ActionButton
            action={deleteExifData}
            variant="destructive"
            loadingMessage="Deleting EXIF data..."
          >
            Delete Data
          </ActionButton>
        </div>
      </div>
    </AdminLayout>
  );
}

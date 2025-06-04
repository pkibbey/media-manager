import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';
import { ExifQueueStatus } from '@/components/admin/exif-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';

export default function ExifAdminPage() {
  const exifColumns = [
    'aperture',
    'camera_make',
    'camera_model',
    'depth_of_field',
    'digital_zoom_ratio',
    'exif_timestamp',
    'exposure_time',
    'field_of_view',
    'flash',
    'focal_length_35mm',
    'gps_latitude',
    'gps_longitude',
    'iso',
    'lens_id',
    'lens_model',
    'light_source',
    'metering_mode',
    'orientation',
    'scene_capture_type',
    'subject_distance',
  ];

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

      <DatabaseColumnAnalysis
        table="exif_data"
        columns={exifColumns}
        title="EXIF Data Table Column Analysis"
        description="Analysis of nullable columns in the exif_data table to identify unused or fully null columns"
      />
    </div>
  );
}

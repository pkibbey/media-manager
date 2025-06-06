'use client';

import { deleteAllExifData } from '@/actions/exif/delete-all-exif-data';
import { ActionButton } from '@/components/admin/action-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';
import { ExifQueueStatus } from '@/components/admin/exif-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { Trash2 } from 'lucide-react';

export default function ExifAdminPage() {
  const exifColumns = [
    'aperture',
    'camera_make',
    'camera_model',
    'depth_of_field',
    'digital_zoom_ratio',
    'exif_process',
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
          The fast method extracts basic EXIF data, while the slow method does
          better on complex images.
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="exifQueue" method="fast" />
        <AddToQueueButton
          queueName="exifQueue"
          method="slow"
          className="opacity-50 hover:opacity-100 transition-opacity"
        />
        <PauseQueueButton queueName="exifQueue" />
        <ActionButton action={deleteAllExifData} variant="destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete All EXIF Data
        </ActionButton>
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

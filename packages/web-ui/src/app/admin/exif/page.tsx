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

  const handleDeleteAllExifData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL EXIF data? This action cannot be undone and will remove all EXIF metadata from the database.',
    );

    if (confirmed) {
      return await deleteAllExifData();
    }

    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">EXIF Analysis</h2>
          <p className="text-muted-foreground">
            Extract exif data from images to analyze camera settings, GPS
            coordinates, and other metadata.
          </p>
        </div>
        <PauseQueueButton queueName="exifQueue" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2 items-start">
          <h3 className="text-xl font-semibold">Fast Processing</h3>
          <AddToQueueButton queueName="exifQueue" method="fast" />
          <p className="text-muted-foreground">
            The fastest method to extract basic EXIF data.
          </p>
        </div>
        <div className="flex flex-col gap-2 items-start opacity-30 hover:opacity-100 transition-opacity">
          <h3 className="text-xl font-semibold">Slow Processing</h3>
          <AddToQueueButton queueName="exifQueue" method="slow" />
          <p className="text-muted-foreground">
            The slowest method to extract basic EXIF data.
          </p>
        </div>
      </div>

      <ExifQueueStatus />

      <DatabaseColumnAnalysis
        table="exif_data"
        columns={exifColumns}
        title="EXIF Data Table Column Analysis"
        description="Analysis of nullable columns in the exif_data table to identify unused or fully null columns"
      />

      <div className="flex flex-col gap-2 items-start">
        <h3 className="text-xl font-semibold">Danger</h3>
        <ActionButton action={handleDeleteAllExifData} variant="destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete All EXIF Data
        </ActionButton>
        <p className="text-muted-foreground">
          This will delete all EXIF data from the database. This action cannot
          be undone.
        </p>
      </div>
    </div>
  );
}

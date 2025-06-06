'use client';

import { deleteAllExifData } from '@/actions/exif/delete-all-exif-data';
import { ActionButton } from '@/components/admin/action-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { ExifQueueStatus } from '@/components/admin/exif-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { Trash2 } from 'lucide-react';

export default function ExifAdminPage() {
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

      <ExifQueueStatus />

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
        <div className="flex flex-col gap-2 items-start">
          <AddToQueueButton queueName="exifQueue" method="fast" />
          <p className="text-muted-foreground">
            This will add all media items to the EXIF queue for analysis.
          </p>
        </div>
      </div>
    </div>
  );
}

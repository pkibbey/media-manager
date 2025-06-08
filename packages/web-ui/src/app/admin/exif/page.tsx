'use client';

import { deleteAllExifData } from '@/actions/exif/delete-all-exif-data';
import { ActionButton } from '@/components/admin/action-button';
import { AddOneToQueueButton } from '@/components/admin/add-one-to-queue-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';
import { ExifQueueStatus } from '@/components/admin/exif-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { getTableColumns } from '@/lib/database-columns';
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

      <DatabaseColumnAnalysis
        table="exif_data"
        columns={getTableColumns.exif_data()}
        title="Exif Coverage"
        description="Analysis of EXIF data in media table"
      />

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        <div className="flex flex-col gap-2 items-start">
          <div className="flex gap-2">
            <AddToQueueButton queueName="exifQueue" method="fast" />
            <AddOneToQueueButton queueName="exifQueue" method="fast" />
          </div>
          <p className="text-muted-foreground">
            This will add all media items to the EXIF queue for analysis.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-md font-semibold text-destructive mb-2">
            Destructive Actions
          </h4>
          <div className="flex flex-col gap-2 items-start">
            <ActionButton
              action={handleDeleteAllExifData}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete All EXIF Data
            </ActionButton>
            <p className="text-muted-foreground">
              This will delete all EXIF data from the database. This action
              cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

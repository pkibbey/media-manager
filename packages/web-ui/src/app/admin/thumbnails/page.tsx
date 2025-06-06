import { deleteAllThumbnails } from '@/actions/thumbnails/delete-all-thumbnails';
import { getFailedThumbnailJobs } from '@/actions/thumbnails/get-failed-thumbnail-jobs';
import { ActionButton } from '@/components/admin/action-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { ThumbnailQueueStatus } from '@/components/admin/thumbnail-queue-status';
import { MediaListContainer } from '@/components/media/media-list/media-list-container';
import { Trash2 } from 'lucide-react';

export default async function ThumbnailAdminPage() {
  const failedMediaItems = await getFailedThumbnailJobs();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Thumbnail Management</h2>
        <p className="text-muted-foreground">
          Manage generation and updates of image thumbnails
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <AddToQueueButton queueName="thumbnailQueue" method="ultra" />
        <AddToQueueButton
          queueName="thumbnailQueue"
          method="fast"
          className="opacity-50 hover:opacity-100 transition-opacity"
        />
        <AddToQueueButton
          queueName="thumbnailQueue"
          method="slow"
          className="opacity-50 hover:opacity-100 transition-opacity"
        />
        <PauseQueueButton queueName="thumbnailQueue" />
        <ActionButton action={deleteAllThumbnails} variant="destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete All Thumbnails
        </ActionButton>
      </div>

      <ThumbnailQueueStatus />

      {failedMediaItems.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              Failed Thumbnail Generation
            </h3>
            <p className="text-muted-foreground">
              Media items that failed thumbnail generation (
              {failedMediaItems.length} items)
            </p>
          </div>
          <MediaListContainer
            media={failedMediaItems}
            totalCount={failedMediaItems.length}
          />
        </div>
      )}

      {failedMediaItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No failed thumbnail generation jobs found.</p>
        </div>
      )}
    </div>
  );
}

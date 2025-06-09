import { getFailedThumbnailJobs } from '@/actions/thumbnails/get-failed-thumbnail-jobs';
import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { ThumbnailQueueStatus } from '@/components/admin/thumbnail-queue-status';
import { MediaListContainer } from '@/components/media/media-list/media-list-container';
import { getTableColumns } from '@/lib/database-columns';
import ThumbnailActions from './thumbnail-actions';

const failedMediaItems = await getFailedThumbnailJobs();

export default async function ThumbnailAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Thumbnail Management</h2>
          <p className="text-muted-foreground">
            Manage generation and updates of image thumbnails
          </p>
        </div>
        <PauseQueueButton queueName="thumbnailQueue" />
      </div>

      <ThumbnailQueueStatus />

      <DatabaseColumnAnalysis
        table="media"
        columns={getTableColumns.media()}
        title="Thumbnail Coverage"
        description="Analysis of thumbnail data in media table"
      />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Failed Thumbnail Generation</h3>
          <p className="text-muted-foreground">
            Media items that failed thumbnail generation (
            {failedMediaItems.length} items)
          </p>
        </div>
        <MediaListContainer media={failedMediaItems} />
      </div>

      <ThumbnailActions />
    </div>
  );
}

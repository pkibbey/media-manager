'use client';

import deleteThumbnailData from '@/actions/thumbnails/delete-thumbnail-data';
import {
	addRemainingToThumbnailsQueue,
	clearThumbnailsQueue,
} from '@/actions/thumbnails/process-thumbnail';
import ActionButton from '@/components/admin/action-button';
import AnalysisCountsCard from '@/components/admin/analysis-counts-card';
import AdminLayout from '@/components/admin/layout';
import PauseQueueButton from '@/components/admin/pause-queue-button';

export default function ThumbnailAdminPage() {
	return (
		<AdminLayout>
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold">Thumbnail Management</h2>
					<p className="text-muted-foreground">
						Manage generation and updates of media thumbnails
					</p>
				</div>

				<AnalysisCountsCard queueName="thumbnailQueue" />

				<div className="flex gap-4">
					<ActionButton
						action={addRemainingToThumbnailsQueue}
						loadingMessage="Processing thumbnails..."
					>
						Process All Remaining
					</ActionButton>
          <PauseQueueButton queueName="thumbnailQueue" />
					<ActionButton
						action={clearThumbnailsQueue}
						variant="destructive"
						loadingMessage="Clearing queue..."
					>
						Clear Queue
					</ActionButton>
					<ActionButton
						action={deleteThumbnailData}
						variant="destructive"
						loadingMessage="Resetting thumbnail data..."
					>
						Delete Data
					</ActionButton>
				</div>
			</div>
		</AdminLayout>
	);
}

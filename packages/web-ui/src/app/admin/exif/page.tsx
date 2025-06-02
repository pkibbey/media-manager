"use client";

import deleteExifData from "@/actions/exif/delete-exif-data";
import {
	addRemainingToExifQueue,
	clearExifQueue,
} from "@/actions/exif/process-batch-exif";
import ActionButton from "@/components/admin/action-button";
import AnalysisCountsCard from "@/components/admin/analysis-counts-card";
import AdminLayout from "@/components/admin/layout";
import PauseQueueButton from "@/components/admin/pause-queue-button";

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
						action={addRemainingToExifQueue}
						loadingMessage="Adding items to queue..."
					>
						Process All Remaining
					</ActionButton>
          <PauseQueueButton queueName="exifQueue" />
					<ActionButton
						action={clearExifQueue}
						variant="destructive"
						loadingMessage="Clearing queue..."
					>
						Clear Queue
					</ActionButton>
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

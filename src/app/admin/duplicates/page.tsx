'use client';

import deleteDuplicatesData from '@/actions/duplicates/delete-duplicates-data';
import {
	addRemainingToDuplicatesQueue,
	clearDuplicatesQueue,
} from '@/actions/duplicates/get-duplicates';
import ActionButton from '@/components/admin/action-button';
import AnalysisCountsCard from '@/components/admin/analysis-counts-card';
import AdminLayout from '@/components/admin/layout';
import PauseQueueButton from '@/components/admin/pause-queue-button';

export default function DuplicatesAdminPage() {
	return (
		<AdminLayout>
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold">Duplicate Detection</h2>
					<p className="text-muted-foreground">
						Manage and process duplicate images using a queue system.
					</p>
				</div>

				<AnalysisCountsCard queueName="duplicatesQueue" />

				<div className="flex gap-4">
					<ActionButton
						action={addRemainingToDuplicatesQueue}
						loadingMessage="Adding items to queue..."
					>
						Process All Remaining
					</ActionButton>
					<ActionButton
						action={clearDuplicatesQueue}
						variant="destructive"
						loadingMessage="Clearing queue..."
					>
						Clear Queue
					</ActionButton>
					<PauseQueueButton queueName="duplicatesQueue" />
					<ActionButton
						action={deleteDuplicatesData}
						variant="destructive"
						loadingMessage="Resetting duplicates data..."
					>
						Reset Duplicates Data
					</ActionButton>
				</div>
			</div>
		</AdminLayout>
	);
}

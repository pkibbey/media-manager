'use client';

import deleteAnalysisData from '@/actions/analysis/delete-analysis-data';
import {
	addRemainingToProcessingQueue,
	clearBasicAnalysisQueue,
} from '@/actions/analysis/process-basic-analysis';
import ActionButton from '@/components/admin/action-button';
import AnalysisCountsCard from '@/components/admin/analysis-counts-card';
import AdminLayout from '@/components/admin/layout';
import PauseQueueButton from '@/components/admin/pause-queue-button';

export default function AnalysisAdminPage() {
	return (
		<AdminLayout>
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold">Object Analysis Management</h2>
					<p className="text-muted-foreground">
						Manage AI-powered image analysis and content understanding
					</p>
				</div>

				<AnalysisCountsCard queueName="objectAnalysisQueue" />

				<div className="flex gap-4">
					<ActionButton
						action={addRemainingToProcessingQueue}
						loadingMessage="Processing analysis data..."
					>
						Process All Remaining
					</ActionButton>
          <PauseQueueButton queueName="objectAnalysisQueue" />
					<ActionButton
						action={clearBasicAnalysisQueue}
						variant="destructive"
						loadingMessage="Clearing queue..."
					>
						Clear Queue
					</ActionButton>
					<ActionButton
						action={deleteAnalysisData}
						variant="destructive"
						loadingMessage="Resetting analysis data..."
					>
						Delete Data
					</ActionButton>
				</div>
			</div>
		</AdminLayout>
	);
}

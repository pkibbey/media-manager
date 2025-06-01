'use client';

import deleteAdvancedAnalysisData from '@/actions/advanced/delete-advanced-data';
import { addRemainingToAdvancedAnalysisQueue, clearAdvancedAnalysisQueue } from '@/actions/advanced/process-advanced';

import ActionButton from '@/components/admin/action-button';
import AnalysisCountsCard from '@/components/admin/analysis-counts-card';
import AdminLayout from '@/components/admin/layout';
import PauseQueueButton from '@/components/admin/pause-queue-button';

export default function AdvancedAnalysisAdminPage() {
	return (
		<AdminLayout>
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold">Advanced AI Analysis</h2>
					<p className="text-muted-foreground">
						Manage deep understanding of media content
					</p>
				</div>

				<AnalysisCountsCard queueName="advancedAnalysisQueue" />

				<div className="flex gap-4">
					<ActionButton
						action={addRemainingToAdvancedAnalysisQueue}
						loadingMessage="Processing analysis data..."
					>
						Process All Remaining
					</ActionButton>
          <PauseQueueButton queueName="advancedAnalysisQueue" />
					<ActionButton
						action={clearAdvancedAnalysisQueue}
						variant="destructive"
						loadingMessage="Clearing queue..."
					>
						Clear Queue
					</ActionButton>
					<ActionButton
						action={deleteAdvancedAnalysisData}
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

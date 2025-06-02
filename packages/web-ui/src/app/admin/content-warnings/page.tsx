"use client";

import deleteContentWarningsData from "@/actions/content-warnings/delete-content-warnings-data";
import {
	addRemainingToContentWarningQueue,
	clearContentWarningsQueue,
} from "@/actions/content-warnings/process-content-warnings";
import ActionButton from "@/components/admin/action-button";
import AnalysisCountsCard from "@/components/admin/analysis-counts-card";
import AdminLayout from "@/components/admin/layout";
import PauseQueueButton from "@/components/admin/pause-queue-button";

export default function ContentWarningsAdminPage() {
	return (
		<AdminLayout>
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold">Content Warnings Management</h2>
					<p className="text-muted-foreground">
						Manage detection and handling of sensitive content in media
					</p>
				</div>

				<AnalysisCountsCard queueName="contentWarningsQueue" />

				<div className="flex gap-4">
					<ActionButton
						action={addRemainingToContentWarningQueue}
						loadingMessage="Processing content warnings..."
					>
						Add all to Queue
					</ActionButton>
          <PauseQueueButton queueName="contentWarningsQueue" />
					<ActionButton
						action={clearContentWarningsQueue}
						variant="destructive"
						loadingMessage="Clearing queue..."
					>
						Clear Queue
					</ActionButton>
					<ActionButton
						action={deleteContentWarningsData}
						variant="destructive"
						loadingMessage="Resetting content warnings data..."
					>
						Delete Data
					</ActionButton>
				</div>
			</div>
		</AdminLayout>
	);
}

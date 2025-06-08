'use client';

import { deleteAllAnalysisData } from '@/actions/analysis/delete-all-analysis-data';
import { ActionButton } from '@/components/admin/action-button';
import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';
import { getTableColumns } from '@/lib/database-columns';
import { Trash2 } from 'lucide-react';

export default function AnalysisAdminPage() {
  const handleDeleteAllAnalysisData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL analysis data? This action cannot be undone and will remove all AI analysis results, object detection data, and content warnings from the database.',
    );

    if (confirmed) {
      return await deleteAllAnalysisData();
    }

    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analysis Data</h2>
        <p className="text-muted-foreground">
          View and manage analysis data for media content
        </p>
      </div>

      <DatabaseColumnAnalysis
        table="analysis_data"
        columns={getTableColumns.analysis_data()}
        title="Analysis Data Column Analysis"
        description="Analysis of analysis_data table columns to identify unused or fully null fields"
      />

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h4 className="text-md font-semibold text-destructive mb-2">
          Destructive Actions
        </h4>
        <div className="flex flex-col gap-2 items-start">
          <ActionButton
            variant="destructive"
            action={handleDeleteAllAnalysisData}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete All Analysis Data
          </ActionButton>
          <p className="text-muted-foreground">
            This will delete all analysis data including AI descriptions, object
            detection results, and content warnings from the database. This
            action cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
}

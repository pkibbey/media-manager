import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';

export default function MediaTypesAdminPage() {
  const mediaTypesColumns = ['id', 'mime_type', 'is_ignored', 'is_native'];

  return (
    <div className="space-y-6">
      <DatabaseColumnAnalysis
        table="media_types"
        columns={mediaTypesColumns}
        title="Media Types Table Column Analysis"
        description="Analysis of nullable columns in the media_types table to identify unused or fully null columns"
      />
    </div>
  );
}

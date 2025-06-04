import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';

export default function MediaAdminPage() {
  const mediaColumns = [
    'media_path',
    'media_type_id',
    'size_bytes',
    'thumbnail_process',
    'thumbnail_url',
    'visual_hash',
    'is_deleted',
    'is_hidden',
  ];

  return (
    <div className="space-y-6">
      <DatabaseColumnAnalysis
        table="media"
        columns={mediaColumns}
        title="Media Table Column Analysis"
        description="Analysis of nullable columns in the media table to identify unused or fully null columns"
      />
    </div>
  );
}

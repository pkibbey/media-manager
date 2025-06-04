import { DatabaseColumnAnalysis } from '@/components/admin/database-column-analysis';

export default function AnalysisAdminPage() {
  const analysisDataColumns = [
    'artistic_elements',
    'colors',
    'content_warnings',
    'emotions',
    'faces',
    'image_description',
    'keywords',
    'objects',
    'people',
    'quality_assessment',
    'scene_types',
    'setting',
    'text_content',
    'time_of_day',
  ];

  return (
    <div className="space-y-6">
      <DatabaseColumnAnalysis
        table="analysis_data"
        columns={analysisDataColumns}
        title="Analysis Data Table Column Analysis"
        description="Analysis of nullable columns in the analysis_data table to identify unused or fully null columns"
      />
    </div>
  );
}

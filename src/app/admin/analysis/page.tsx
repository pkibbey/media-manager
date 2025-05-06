import AnalysisProcessor from '@/components/admin/analysis/analysis-processor';

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Image Analysis</h1>
      <p className="text-muted-foreground">
        Extract keywords, objects, and scene information from your images using
        OpenCV
      </p>
      <AnalysisProcessor />
    </div>
  );
}

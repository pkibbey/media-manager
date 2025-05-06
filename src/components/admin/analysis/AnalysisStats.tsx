import { UnifiedStatsDisplay } from '@/components/ui/unified-stats-display';
import type { UnifiedStats } from '@/types/unified-stats';

type AnalysisStatsProps = {
  stats: UnifiedStats;
};

export function AnalysisStats({ stats }: AnalysisStatsProps) {
  return (
    <UnifiedStatsDisplay
      stats={stats}
      title="Image Keyword Analysis"
      description="Extract keywords, objects, and scene types from images for improved searching and organization."
      labels={{
        success: 'images analyzed',
        failed: 'images failed',
      }}
      tooltipContent={
        <p>
          Analysis extracts visual information from images, such as objects,
          scenes, and dominant colors to enhance search capabilities and media
          organization.
        </p>
      }
    />
  );
}

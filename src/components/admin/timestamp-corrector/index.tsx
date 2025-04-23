import { getMediaStats } from '@/app/actions/stats';
import { CorrectorClient } from './CorrectorClient';
import { CorrectorStats } from './CorrectorStats';

export async function TimestampCorrector() {
  // Fetch initial stats to pass to the client component
  const { data: stats } = await getMediaStats();
  const needsCorrection = stats?.needsTimestampCorrectionCount || 0;

  return (
    <div className="space-y-4">
      {/* Server component for displaying stats */}
      <CorrectorStats />

      {/* Client component for interactivity */}
      <CorrectorClient initialNeedsCorrection={needsCorrection} />
    </div>
  );
}

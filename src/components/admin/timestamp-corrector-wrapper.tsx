import { getMediaStats } from '@/app/actions/stats';
import TimestampCorrectorClient from './timestamp-corrector';
import { TimestampCorrectorStats } from './timestamp-corrector-stats';

export async function TimestampCorrectorWrapper() {
  // Fetch initial stats to pass to the client component
  const { data: stats } = await getMediaStats();
  const needsCorrection = stats?.needsTimestampCorrectionCount || 0;

  return (
    <div className="space-y-4">
      {/* Server component for displaying stats */}
      <TimestampCorrectorStats />

      {/* Client component for interactivity */}
      <TimestampCorrectorClient initialNeedsCorrection={needsCorrection} />
    </div>
  );
}

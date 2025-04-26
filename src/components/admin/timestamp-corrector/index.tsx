import { CorrectorClient } from './CorrectorClient';
import { CorrectorStats } from './CorrectorStats';

export async function TimestampCorrector() {
  return (
    <div className="space-y-4">
      {/* Server component for displaying stats */}
      <CorrectorStats />

      {/* Client component for interactivity */}
      <CorrectorClient />
    </div>
  );
}

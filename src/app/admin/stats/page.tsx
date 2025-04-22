import MediaStats from '@/components/admin/media-stats';
import { Suspense } from 'react';

export default function StatsPage() {
  return (
    <div className="items-start">
      <Suspense fallback={<div>Loading statistics...</div>}>
        <MediaStats />
      </Suspense>
    </div>
  );
}

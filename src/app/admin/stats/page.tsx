import { Suspense } from 'react';
import MediaStats from '@/components/admin/media-stats';
import { ProcessingStatesViewer } from '@/components/admin/processing-states-viewer';

export default function StatsPage() {
  return (
    <div className="flex flex-col gap-6 items-start">
      <Suspense fallback={<div>Loading statistics...</div>}>
        <MediaStats />
        <ProcessingStatesViewer />
      </Suspense>
    </div>
  );
}

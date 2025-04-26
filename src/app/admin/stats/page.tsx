import { Suspense } from 'react';
import AllMediaStats from '@/components/admin/all-media-stats';
import { ProcessingStatesViewer } from '@/components/admin/processing-states-viewer';

export default function StatsPage() {
  return (
    <div className="flex flex-col gap-6 items-start">
      <Suspense fallback={<div>Loading statistics...</div>}>
        <AllMediaStats />
        <ProcessingStatesViewer />
      </Suspense>
    </div>
  );
}

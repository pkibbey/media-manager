import ResetTimestamps from '@/components/admin/reset-timestamps';
import { TimestampCorrector } from '@/components/admin/timestamp-corrector';
import { Suspense } from 'react';

export default function TimestampsPage() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
      <Suspense fallback={<div>Loading timestamp corrector...</div>}>
        <TimestampCorrector />
      </Suspense>
      <ResetTimestamps />
    </div>
  );
}

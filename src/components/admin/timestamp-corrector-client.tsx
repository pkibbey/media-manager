'use client';

import { CorrectorClient } from './timestamp-corrector/CorrectorClient';

export type TimestampCorrectorProps = {
  initialNeedsCorrection?: number;
};

export default function TimestampCorrectorClient({
  initialNeedsCorrection = 0,
}: TimestampCorrectorProps) {
  return <CorrectorClient initialNeedsCorrection={initialNeedsCorrection} />;
}

// src/components/admin/analysis-processor.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessingTimeEstimator } from '../processing-time-estimator';
import { AnalysisActionButtons } from './AnalysisActionButtons';
import { AnalysisProcessOptions } from './AnalysisProcessOptions';
import { AnalysisStats } from './AnalysisStats';
import { useAnalysisProcessor } from './useAnalysisProcessor';

export default function AnalysisProcessor() {
  const {
    stats,
    isProcessing,
    progress,
    handleStartProcessing,
    handleCancel,
    refreshStats,
    processingStartTime,
    batchSize,
    setBatchSize,
    method,
    setMethod,
  } = useAnalysisProcessor();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Keyword Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <AnalysisStats stats={stats} />
        <AnalysisProcessOptions
          progress={progress}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          method={method}
          setMethod={setMethod}
          disabled={isProcessing}
        />
        <AnalysisActionButtons
          isProcessing={isProcessing}
          hasItems={stats.counts?.total > 0}
          onStart={handleStartProcessing}
          onCancel={handleCancel}
          onRefresh={refreshStats}
        />
        {isProcessing && progress && (
          <ProcessingTimeEstimator
            isProcessing={isProcessing}
            startTime={processingStartTime}
            progress={progress}
          />
        )}
        {/* Error display */}
      </CardContent>
    </Card>
  );
}

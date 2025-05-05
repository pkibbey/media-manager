'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisActionButtons } from './analyisis-processor/AnalysisActionButtons';
import { AnalysisProcessOptions } from './analyisis-processor/AnalysisProcessOptions';
import { AnalysisStats } from './analyisis-processor/AnalysisStats';
import { useAnalysisProcessor } from './analyisis-processor/useAnalysisProcessor';
import { ProcessingTimeEstimator } from './processing-time-estimator';

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
    errorSummary,
  } = useAnalysisProcessor();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Keyword Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <AnalysisStats stats={stats} />
        <AnalysisProcessOptions
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          method={method}
          setMethod={setMethod}
          disabled={isProcessing}
          progress={progress}
        />
        <AnalysisActionButtons
          isProcessing={isProcessing}
          hasItems={stats?.counts?.total > 0}
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
        {errorSummary && errorSummary.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            <h3 className="font-medium">Errors encountered:</h3>
            <ul className="list-disc pl-4 mt-2 text-sm">
              {errorSummary.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

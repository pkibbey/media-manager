'use client';

import { UnifiedProgressDisplay } from '@/components/ui/unified-progress-display';
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
    errorSummary,
  } = useAnalysisProcessor();

  return (
    <div className="overflow-hidden grid gap-4 space-y-4">
      <div className="overflow-hidden bg-neutral-400/20 rounded-md p-4">
        {!isProcessing && stats && <AnalysisStats stats={stats} />}

        {isProcessing && (
          <UnifiedProgressDisplay
            stats={stats}
            isProcessing={isProcessing}
            progress={progress}
            processingStartTime={processingStartTime}
            title="Analyzing Images"
            itemsLabel="images"
            rateUnit="images/sec"
            className="overflow-hidden"
          />
        )}
      </div>

      {!isProcessing && (
        <AnalysisProcessOptions
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          method={method}
          setMethod={setMethod}
          disabled={isProcessing}
          progress={progress}
        />
      )}
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
    </div>
  );
}

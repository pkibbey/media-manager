// src/components/admin/analysis-processor/useAnalysisProcessor.ts
'use client';

import { useCallback } from 'react';
import { getAnalysisStats } from '@/actions/analysis/get-analysis-stats';
import { streamAnalysisData } from '@/actions/analysis/streamAnalysisData';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import type { UnifiedProgress } from '@/types/progress-types';
import type { Method, UnifiedStats } from '@/types/unified-stats';

interface AnalysisProgress extends UnifiedProgress {
  method?: Method;
}

export function useAnalysisProcessor() {
  // Define stream function generator
  const getStreamFunction = useCallback(
    (options: { batchSize: number; method: Method }) => {
      return () => streamAnalysisData(options) as Promise<ReadableStream<any>>;
    },
    [],
  );

  // Use the processor base hook
  const baseProcessor = useProcessorBase<AnalysisProgress, UnifiedStats>({
    fetchStats: async () => {
      const { data, error } = await getAnalysisStats();
      console.log('data: ', data);
      console.log('error: ', error);

      if (error || !data) {
        throw error;
      }

      return data;
    },
    getStreamFunction,
    defaultBatchSize: 50,
    defaultMethod: 'default' as Method,
    successMessage: {
      start: 'Starting image analysis...',
      onBatchComplete: (processed) =>
        `Batch complete: Analyzed ${processed} images`,
      onCompleteEach: () => 'Image analysis completed successfully',
    },
  });

  // Handle analysis with option to process all
  const handleStartProcessing = async ({ processAll = false }) => {
    try {
      await baseProcessor.handleStartProcessing({ processAll });
    } catch (error) {
      console.error('[Image Analysis] Error initiating image analysis:', error);
    }
  };

  return {
    // State
    stats: baseProcessor.stats,
    isProcessing: baseProcessor.isProcessing,
    progress: baseProcessor.progress,
    hasError: baseProcessor.hasError,
    errorSummary: baseProcessor.errorSummary,
    batchSize: baseProcessor.batchSize,
    setBatchSize: baseProcessor.setBatchSize,
    processingStartTime: baseProcessor.processingStartTime,
    method: baseProcessor.method,
    setMethod: baseProcessor.setMethod,

    // Actions
    handleStartProcessing,
    handleCancel: baseProcessor.handleCancel,
    refreshStats: baseProcessor.refreshStats,
  };
}

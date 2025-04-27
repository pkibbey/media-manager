'use client';

import { useCallback } from 'react';
import { streamFolders } from '@/app/actions/scan/streamFolders';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import type { UnifiedProgress } from '@/types/progress-types';
import type { UnifiedStats } from '@/types/unified-stats';

export function useScanFolders() {
  // Define stream function generator
  const getStreamFunction = useCallback(() => {
    return () => streamFolders();
  }, []);

  // Use the processor base hook
  const {
    isProcessing,
    progress,
    hasError,
    errorSummary,
    handleStartProcessing,
    handleCancel,
    stats,
    refreshStats,
  } = useProcessorBase<UnifiedProgress, UnifiedStats>({
    fetchStats: async () => {
      // This would be replaced with a real API call when available
      return {
        status: 'success',
        message: 'Scan stats retrieved',
        counts: {
          total: 0,
          success: 0,
          failed: 0,
        },
        percentages: {
          completed: 0,
          error: 0,
        },
      };
    },
    getStreamFunction,
    successMessage: {
      start: 'Starting folder scan...',
      onBatchComplete: (processed) =>
        `Scan complete: Processed ${processed} files`,
      onCompleteEach: () => 'Folder scan completed successfully',
    },
  });

  // Simplified method to start scanning
  const startScan = () => {
    handleStartProcessing(false);
  };

  return {
    stats,
    isScanning: isProcessing,
    progress,
    hasError,
    errorSummary,
    startScan,
    cancelScan: handleCancel,
    scanStats: stats,
    refreshScanStats: refreshStats,
  };
}

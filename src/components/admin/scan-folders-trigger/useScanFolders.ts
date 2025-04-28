'use client';

import { useCallback } from 'react';
import { getScanFolders } from '@/actions/scan/get-scan-folders';
import { streamFolders } from '@/actions/scan/streamFolders';
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
    refreshStats: fetchStats,
  } = useProcessorBase<UnifiedProgress, UnifiedStats>({
    fetchStats: async () => {
      const { data, error, count } = await getScanFolders();
      console.log('error: ', error);

      // The stats here represent folders, not files processed by the scan.
      // This might need adjustment depending on how stats are displayed.
      return {
        status: 'processing',
        message: 'Scan folders fetched successfully',
        data: data, // Keep folder data if needed elsewhere
        counts: {
          total: count || 0, // Total number of folders configured
          // These counts might not be directly applicable when just fetching folders.
          // Setting them to 0 or reflecting folder status might be better.
          success: 0,
          failed: 0,
          pending: count || 0, // Represents folders potentially needing scanning
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
    fetchStats,
  };
}

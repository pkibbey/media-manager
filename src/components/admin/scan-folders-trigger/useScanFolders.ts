'use client';

import { useCallback } from 'react';
import { streamFolders } from '@/app/actions/scan/streamFolders';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import type { UnifiedProgress } from '@/types/progress-types';
import type { UnifiedStats } from '@/types/unified-stats';
import { getScanFolders } from '@/app/actions/scan/get-scan-folders';

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

          if (error) {
            console.error('[SCAN DEBUG] Error fetching scan folder stats:', error); // Corrected debug message
            throw error;
          }

          // The stats here represent folders, not files processed by the scan.
          // This might need adjustment depending on how stats are displayed.
          return {
            status: 'success',
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
    refreshScanStats: fetchStats,
  };
}

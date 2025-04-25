import { useCallback } from 'react';
import { scanFolders } from '@/app/actions/scan';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import type { UnifiedProgress } from '@/types/progress-types';

export interface ScanStats {
  totalFolders: number;
  totalFiles: number;
  completedFiles: number;
  pendingFiles: number;
}

export function useScanFolders() {
  // Define stream function generator
  const getStreamFunction = useCallback(() => {
    return () => scanFolders();
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
  } = useProcessorBase<UnifiedProgress, ScanStats>({
    fetchStats: async () => {
      // This would be replaced with a real API call when available
      return {
        totalFolders: 0,
        totalFiles: 0,
        completedFiles: 0,
        pendingFiles: 0,
      };
    },
    getStreamFunction,
    successMessage: {
      start: 'Starting folder scan...',
      batchComplete: (processed) =>
        `Scan complete: Processed ${processed} files`,
      allComplete: () => 'Folder scan completed successfully',
    },
  });

  // Simplified method to start scanning
  const startScan = () => {
    handleStartProcessing(false);
  };

  return {
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

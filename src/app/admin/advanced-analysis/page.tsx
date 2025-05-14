'use client';

import { AlertTriangle, Image, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getAdvancedAnalysisStats } from '@/actions/analysis/get-advanced-analysis-stats';
import {
  deleteAdvancedAnalysisData,
  processAdvancedAnalysis,
} from '@/actions/analysis/process-advanced-analysis';
import ActionButton from '@/components/admin/action-button';
import AdminLayout from '@/components/admin/layout';
import { StatsCard } from '@/components/admin/stats-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useContinuousProcessing from '@/hooks/useContinuousProcessing';

interface AdvancedAnalysisStatsType {
  total: number;
  processed: number;
  remaining: number;
  percentComplete: number;
}

// Helper function to format time in seconds to mm:ss format
const formatTime = (timeInMs: number | null) => {
  if (timeInMs === null || timeInMs === undefined) return 'N/A';
  const totalSeconds = Math.floor(timeInMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
};

export default function AdvancedAnalysisAdminPage() {
  const [analysisStats, setAnalysisStats] =
    useState<AdvancedAnalysisStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBatchResult, setLastBatchResult] = useState<any>(null);

  // Fetch analysis stats on page load
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getAdvancedAnalysisStats();

        if (response.stats) {
          setAnalysisStats(response.stats);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (e) {
        setError('Failed to load advanced analysis statistics');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Action for refreshing stats
  const refreshStats = useCallback(async () => {
    try {
      const response = await getAdvancedAnalysisStats();

      if (response.stats) {
        setAnalysisStats(response.stats);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh stats');
      console.error(e);
    }
  }, []);

  // For action button use
  const refreshStatsWithResult = async () => {
    const response = await getAdvancedAnalysisStats();

    if (response.stats) {
      setAnalysisStats(response.stats);
      return { success: true };
    }

    return { success: false, error: response.error || 'Unknown error' };
  };

  const resetAnalysisData = async () => {
    const { error, count } = await deleteAdvancedAnalysisData();

    if (error) {
      console.error('Error resetting advanced analysis data:', error);
      return { success: false, error: String(error) };
    }

    if (count) {
      setAnalysisStats((prev: any) => ({
        ...prev,
        total: prev.total,
        processed: 0,
        remaining: prev.total,
        percentComplete: 0,
      }));
    }

    // Refresh stats after resetting
    await refreshStats();

    return {
      success: true,
      message: `Reset ${count} advanced analysis data items`,
    };
  };

  // Process batch function for continuous processing
  const processBatchFunction = useCallback(
    async (size: number) => {
      const result = await processAdvancedAnalysis(size);

      // Store the result for UI display
      setLastBatchResult(result);

      // Refresh stats after processing
      await refreshStats();

      return result;
    },
    [refreshStats],
  );

  // Process a batch of items (for manual batch processing)
  const processBatch = async () => {
    try {
      const result = await processAdvancedAnalysis(batchSize);

      if (result.success) {
        await refreshStats();
        return {
          success: true,
          message: `Processed ${result.processed} items (${result.failed || 0} failed)`,
        };
      }

      return { success: false, error: result.error };
    } catch (e) {
      console.error('Error processing batch:', e);
      return {
        success: false,
        error:
          e instanceof Error ? e.message : 'Unknown error processing batch',
      };
    }
  };

  // Handle batch completion
  const handleBatchComplete = useCallback(async () => {
    await refreshStats();
  }, [refreshStats]);

  // Set up continuous processing
  const {
    isContinuousProcessing,
    processAllRemaining,
    stopProcessing,
    batchSize,
    setBatchSize,
    totalProcessingTime,
    estimatedTimeLeft,
    itemsProcessedThisSession,
  } = useContinuousProcessing({
    processBatchFn: processBatchFunction,
    hasRemainingItemsFn: () => (analysisStats?.remaining || 0) > 0,
    onBatchComplete: handleBatchComplete,
    getTotalRemainingItemsFn: () => analysisStats?.remaining || 0,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Advanced Analysis with Ollama
          </h1>
          <p className="text-muted-foreground">
            Process media files with advanced AI analysis using Ollama and
            Gemma3 vision models.
          </p>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <ActionButton
              action={processBatch}
              variant="default"
              loadingMessage="Processing..."
              successMessage="Processing complete"
            >
              Process Next Media
            </ActionButton>

            {isContinuousProcessing ? (
              <ActionButton
                action={stopProcessing}
                variant="destructive"
                loadingMessage="Stopping..."
                successMessage="Processing stopped"
              >
                Stop Processing
              </ActionButton>
            ) : (
              <ActionButton
                action={processAllRemaining}
                variant="default"
                loadingMessage="Starting..."
                successMessage="Processing all remaining items"
                disabled={!analysisStats || analysisStats.remaining === 0}
              >
                Process All
              </ActionButton>
            )}

            <ActionButton
              action={resetAnalysisData}
              variant="destructive"
              loadingMessage="Resetting..."
              successMessage="Data reset complete"
              disabled={!analysisStats || analysisStats.processed === 0}
            >
              Reset Data
            </ActionButton>
          </div>

          <ActionButton
            action={refreshStatsWithResult}
            variant="outline"
            loadingMessage="Refreshing..."
            successMessage="Stats updated"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Stats
          </ActionButton>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <StatsCard
          title="Advanced Analysis Processing Status"
          total={analysisStats?.total || 0}
          processed={analysisStats?.processed || 0}
          isLoading={isLoading}
          icon={<Image className="h-4 w-4" />}
          className="w-full"
        />

        {isContinuousProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing in progress...</span>
              <span>
                {itemsProcessedThisSession} items processed in{' '}
                {formatTime(totalProcessingTime)}
              </span>
            </div>
            <Progress
              value={analysisStats?.percentComplete || 0}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{batchSize} items per batch</span>
              <span>Est. time remaining: {formatTime(estimatedTimeLeft)}</span>
            </div>
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="results">Recent Results</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium">
                  Advanced Analysis Details
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Advanced analysis uses Ollama with{' '}
                  {process.env.NEXT_PUBLIC_VISION_MODEL || 'vision model'} to
                  extract detailed information about images, including objects,
                  scene details, people, and quality assessment.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium">Processing Stats</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Items:</span>
                    <span className="text-sm font-medium">
                      {analysisStats?.total || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Processed:</span>
                    <span className="text-sm font-medium">
                      {analysisStats?.processed || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Remaining:</span>
                    <span className="text-sm font-medium">
                      {analysisStats?.remaining || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium">Last Batch</h3>
                {lastBatchResult ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Processed:</span>
                      <span className="text-sm font-medium">
                        {lastBatchResult.processed || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Failed:</span>
                      <span className="text-sm font-medium">
                        {lastBatchResult.failed || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Duration:</span>
                      <span className="text-sm font-medium">
                        {formatTime(lastBatchResult.duration)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    No batch processed yet
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <p className="text-sm text-muted-foreground">
              View detailed results from recent analysis processing.
            </p>
            {/* Results display would go here */}
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-medium">Batch Size</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Number of items to process in each batch
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={batchSize}
                    onChange={(e) =>
                      setBatchSize(Number.parseInt(e.target.value))
                    }
                    className="w-full mt-4"
                  />
                  <div className="flex justify-between text-sm mt-1">
                    <span>1</span>
                    <span>{batchSize}</span>
                    <span>50</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

'use client';

import { AlertTriangle, Image, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';
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
import { useAdminData } from '@/hooks/useAdminData';
import useContinuousProcessing from '@/hooks/useContinuousProcessing';
import { formatTime } from '@/lib/format-time';

interface AdvancedAnalysisStatsType {
  total: number;
  processed: number;
  remaining: number;
  percentComplete: number;
}

export default function AdvancedAnalysisAdminPage() {
  // Use the shared admin data hook
  const {
    data: analysisStats,
    setData: setAnalysisStats,
    isLoading,
    error,
    refresh: refreshStats,
    refreshWithResult: refreshStatsWithResult,
  } = useAdminData<AdvancedAnalysisStatsType>({
    fetchFunction: getAdvancedAnalysisStats,
  });

  const [lastBatchResult, setLastBatchResult] = useState<any>(null);

  const resetAnalysisData = async () => {
    const { error, count } = await deleteAdvancedAnalysisData();

    if (error) {
      console.error('Error resetting advanced analysis data:', error);
      return { success: false, error: error.message };
    }

    if (count) {
      setAnalysisStats((prev: any) => ({
        ...prev,
        total: prev.total - count,
        processed: prev.processed - count,
        remaining: prev.remaining + count,
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Advanced AI Analysis</h2>
            <p className="text-muted-foreground">
              Manage deep understanding of media content
            </p>
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
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <StatsCard
          title="Advanced Analysis Status"
          total={analysisStats?.total || 0}
          processed={analysisStats?.processed || 0}
          isLoading={isLoading}
          icon={<Image className="h-4 w-4" />}
          className="w-full"
        />

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Advanced AI analysis uses local LLM models to deeply analyze
                media content. This process is more resource-intensive than
                basic analysis.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Processing Details</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Total Media Items:</span>
                    <span>{analysisStats?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processed Items:</span>
                    <span>{analysisStats?.processed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining Items:</span>
                    <span>{analysisStats?.remaining || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completion:</span>
                    <span>{analysisStats?.percentComplete || 0}%</span>
                  </div>
                </div>
                <Progress
                  value={analysisStats?.percentComplete || 0}
                  className="h-2"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">
                  Advanced Analysis Features
                </h3>
                <ul className="text-sm space-y-2 list-disc pl-5">
                  <li>Visual scene & context understanding</li>
                  <li>Detailed object identification</li>
                  <li>Advanced contextual relationships</li>
                  <li>Enhanced search capabilities</li>
                  <li>Better organization suggestions</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4 mt-4">
            <Alert>
              <AlertDescription>
                {analysisStats?.remaining === 0
                  ? 'All items have been processed.'
                  : `${analysisStats?.remaining} items remaining to process`}
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-8">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Batch Size:</span>
                  <span className="text-sm font-medium">{batchSize}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Smaller (Faster)</span>
                  <span>Larger (Slower)</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Processing larger batches requires more resources and may be
                  slower per batch.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton
                action={processBatch}
                disabled={
                  analysisStats?.remaining === 0 || isContinuousProcessing
                }
                loadingMessage="Processing batch..."
                successMessage="Batch processed successfully"
              >
                Process Batch
              </ActionButton>

              {isContinuousProcessing ? (
                <ActionButton
                  action={async () => {
                    const result = await stopProcessing();
                    return { success: result.success, error: result.error };
                  }}
                  variant="destructive"
                  loadingMessage="Stopping..."
                  successMessage="Processing stopped"
                >
                  Stop Processing
                </ActionButton>
              ) : (
                <ActionButton
                  action={async () => {
                    const result = await processAllRemaining();
                    return {
                      success: result.success,
                      error: result.error,
                      message: result.message,
                    };
                  }}
                  disabled={analysisStats?.remaining === 0}
                  loadingMessage="Processing all items..."
                  successMessage="Processing started"
                  variant="secondary"
                >
                  Process All Remaining
                </ActionButton>
              )}

              <ActionButton
                action={resetAnalysisData}
                variant="destructive"
                disabled={isContinuousProcessing}
                loadingMessage="Resetting analysis data..."
                successMessage="Analysis data reset"
              >
                Reset Analysis Data
              </ActionButton>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4 mt-4">
            {isContinuousProcessing && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Current Processing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Session Progress:</span>
                      <span>{itemsProcessedThisSession} items</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Processing Time:</span>
                      <span>{formatTime(totalProcessingTime)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Time Remaining:</span>
                      <span>{formatTime(estimatedTimeLeft)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {lastBatchResult && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Last Batch Results</h3>
                <div className="text-sm">
                  <p>
                    Processed: {lastBatchResult.processed || 0} items
                    {lastBatchResult.failed
                      ? ` (${lastBatchResult.failed} failed)`
                      : ''}
                  </p>
                  {lastBatchResult.error && (
                    <p className="text-destructive">
                      Error: {lastBatchResult.error}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground border rounded-md p-4">
              <p className="font-medium mb-2">Note about advanced analysis:</p>
              <p>
                Advanced analysis uses the Ollama API with more sophisticated
                models to extract detailed information from images. This process
                is more resource-intensive and may take longer to complete than
                basic analysis.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

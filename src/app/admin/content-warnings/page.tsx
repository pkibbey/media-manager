'use client';

import { AlertTriangle } from 'lucide-react';
import { getContentWarningsStats } from '@/actions/analysis/get-content-warnings-stats';
import {
  deleteContentWarningsData,
  processContentWarnings,
} from '@/actions/analysis/process-content-warnings';
import ActionButton from '@/components/admin/action-button';
import { StatsCard } from '@/components/admin/stats-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type DeleteResult, useAdminData } from '@/hooks/useAdminData';
import { MAX_BATCH_SIZE } from '@/lib/consts';
import { formatTime } from '@/lib/format-time';

export default function ContentWarningsAdminPage() {
  // Wrapper to match DeleteResult interface
  const deleteContentWarningsDataWrapper = async (): Promise<DeleteResult> => {
    try {
      const result = await deleteContentWarningsData();
      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Unknown error',
        };
      }
      return {
        success: true,
        count: result.count || 0,
        message: `Reset ${result.count || 0} content warnings data items`,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  };

  // Use the common admin data hook
  const {
    data: contentWarningsStats,
    isLoading,
    error,
    processBatch,
    resetData,
    isContinuousProcessing,
    processAllRemaining,
    stopProcessing,
    batchSize,
    setBatchSize,
    totalProcessingTime,
    estimatedTimeLeft,
    itemsProcessedThisSession,
  } = useAdminData({
    fetchFunction: getContentWarningsStats,
    processFunction: processContentWarnings,
    deleteFunction: deleteContentWarningsDataWrapper,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content Warnings Processing</h2>
        <p className="text-muted-foreground">
          Detect and manage potentially sensitive content in media
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <StatsCard
        title="Content Warnings Status"
        total={contentWarningsStats?.total || 0}
        processed={contentWarningsStats?.processed || 0}
        isLoading={isLoading}
        icon={<AlertTriangle className="h-4 w-4" />}
        className="w-full"
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Warnings Overview</CardTitle>
              <CardDescription>
                Status of content sensitivity detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contentWarningsStats ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Processing Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div>
                          Total Media Items: {contentWarningsStats.total}
                        </div>
                        <div>
                          Processed Items: {contentWarningsStats.processed}
                        </div>
                        <div>
                          Remaining Items: {contentWarningsStats.remaining}
                        </div>
                        <div>
                          Completion: {contentWarningsStats.percentComplete}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  {isLoading
                    ? 'Loading content warnings data...'
                    : 'No content warnings data available'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Processing</CardTitle>
              <CardDescription>
                Process content warnings detection in batches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch-size">Batch Size ({batchSize})</Label>
                <div className="space-y-2">
                  <Slider
                    id="batch-size"
                    min={1}
                    max={MAX_BATCH_SIZE}
                    step={1}
                    value={[batchSize]}
                    onValueChange={(value) => setBatchSize(value[0])}
                    disabled={isContinuousProcessing}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Smaller (Faster)</span>
                    <span>Larger (Slower)</span>
                  </div>
                </div>
              </div>

              {isContinuousProcessing && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Processing Status</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      Processed this session: {itemsProcessedThisSession}
                    </div>
                    <div>
                      Total processing time: {formatTime(totalProcessingTime)}
                    </div>
                    <div>
                      Estimated time left:{' '}
                      {estimatedTimeLeft !== null
                        ? formatTime(estimatedTimeLeft)
                        : 'Calculating...'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <ActionButton
                action={processBatch}
                disabled={
                  contentWarningsStats?.remaining === 0 ||
                  isContinuousProcessing
                }
                loadingMessage="Processing content warnings..."
                successMessage="Content warnings processed successfully"
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
                  disabled={contentWarningsStats?.remaining === 0}
                  loadingMessage="Processing all items..."
                  successMessage="All items processed successfully"
                  variant="secondary"
                >
                  Process All
                </ActionButton>
              )}
              {resetData && (
                <ActionButton
                  action={resetData}
                  variant="destructive"
                  disabled={isContinuousProcessing}
                  loadingMessage="Resetting content warnings data..."
                  successMessage="Content warnings data reset successfully"
                >
                  Reset Data
                </ActionButton>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

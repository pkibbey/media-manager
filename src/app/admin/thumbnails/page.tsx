'use client';

import { Image, RefreshCw, Settings } from 'lucide-react';
import { useCallback } from 'react';
import { deleteThumbnailData } from '@/actions/thumbnails/delete-thumbnail-data';
import { getThumbnailStats } from '@/actions/thumbnails/get-thumbnail-stats';
import { processBatchThumbnails } from '@/actions/thumbnails/process-thumbnails';
import ActionButton from '@/components/admin/action-button';
import AdminLayout from '@/components/admin/layout';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminData } from '@/hooks/useAdminData';
import useContinuousProcessing from '@/hooks/useContinuousProcessing';
import { formatTime } from '@/lib/format-time';

interface ThumbnailStatsType {
  total: number;
  processed: number;
  remaining: number;
  percentComplete: number;
}

export default function ThumbnailAdminPage() {
  const {
    data: thumbnailStats,
    setData: setThumbnailStats,
    isLoading,
    error,
    refresh: refreshStats,
    refreshWithResult: refreshStatsWithResult,
  } = useAdminData<ThumbnailStatsType>({
    fetchFunction: getThumbnailStats,
  });

  const resetThumbnailData = async () => {
    const { error, count } = await deleteThumbnailData();

    if (error) {
      console.error('Error resetting thumbnail data:', error);
      return { success: false, error: String(error) };
    }

    if (count) {
      setThumbnailStats((prev: any) => ({
        ...prev,
        total: prev.total - count,
        processed: prev.processed - count,
        remaining: prev.remaining + count,
      }));
    }

    // Refresh stats after resetting
    await refreshStats();

    return { success: true, message: `Reset ${count} thumbnail data items` };
  };

  // Process batch function for continuous processing
  const processBatchFunction = useCallback(
    async (size: number) => {
      const result = await processBatchThumbnails(size);

      // Refresh stats after processing
      await refreshStats();

      return result;
    },
    [refreshStats],
  );

  // Process a batch of items (for manual batch processing)
  const processBatch = async () => {
    try {
      const result = await processBatchThumbnails(batchSize);

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
    hasRemainingItemsFn: () => (thumbnailStats?.remaining || 0) > 0,
    onBatchComplete: handleBatchComplete,
    getTotalRemainingItemsFn: () => thumbnailStats?.remaining || 0,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Thumbnail Processing</h2>
            <p className="text-muted-foreground">
              Generate and manage thumbnails for your media library
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
          title="Thumbnail Processing Status"
          total={thumbnailStats?.total || 0}
          processed={thumbnailStats?.processed || 0}
          isLoading={isLoading}
          icon={<Image className="h-4 w-4" />}
          className="w-full"
        />

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Thumbnail Overview</CardTitle>
                <CardDescription>
                  Details about thumbnail generation process
                </CardDescription>
              </CardHeader>
              <CardContent>
                {thumbnailStats ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Processing Status</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div>Total Media Items: {thumbnailStats.total}</div>
                          <div>Processed Items: {thumbnailStats.processed}</div>
                          <div>Remaining Items: {thumbnailStats.remaining}</div>
                          <div>
                            Completion: {thumbnailStats.percentComplete}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium mb-2">
                        About Thumbnail Processing
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Thumbnails are smaller, optimized versions of your media
                        files that enable faster browsing and previews. The
                        system generates optimized JPEG thumbnails at different
                        sizes to support various UI requirements.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    {isLoading
                      ? 'Loading thumbnail data...'
                      : 'No thumbnail data available'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Process Thumbnails</CardTitle>
                <CardDescription>
                  Generate thumbnails for unprocessed media files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="batch-size"
                      type="number"
                      min="1"
                      max="100"
                      value={batchSize}
                      onChange={(e) =>
                        setBatchSize(Number.parseInt(e.target.value) || 10)
                      }
                      className="max-w-[120px]"
                    />
                    <span className="text-sm text-muted-foreground">
                      Number of items to process in a single batch
                    </span>
                  </div>
                </div>

                {thumbnailStats?.remaining === 0 ? (
                  <Alert>
                    <AlertTitle>No items to process</AlertTitle>
                    <AlertDescription>
                      All media items have been processed for thumbnails.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {thumbnailStats?.remaining} items remaining to be processed
                  </div>
                )}

                {isContinuousProcessing && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Processing Status:
                    </h4>
                    <div className="text-sm space-y-1">
                      <p>
                        Items processed this session:{' '}
                        {itemsProcessedThisSession}
                      </p>
                      <p>
                        Total processing time: {formatTime(totalProcessingTime)}
                      </p>
                      <p>
                        Estimated time remaining:{' '}
                        {formatTime(estimatedTimeLeft)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <ActionButton
                  action={processBatch}
                  disabled={
                    thumbnailStats?.remaining === 0 || isContinuousProcessing
                  }
                  loadingMessage="Processing thumbnails..."
                  successMessage="Thumbnails processed successfully"
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
                    loadingMessage="Processing..."
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
                    disabled={thumbnailStats?.remaining === 0}
                    loadingMessage="Processing all items..."
                    successMessage="All items processed successfully"
                    variant="secondary"
                  >
                    Process All Remaining
                  </ActionButton>
                )}
                <ActionButton
                  action={resetThumbnailData}
                  variant="destructive"
                  disabled={isContinuousProcessing}
                  loadingMessage="Resetting thumbnail data..."
                  successMessage="Thumbnail data reset successfully"
                >
                  Reset Thumbnail Data
                </ActionButton>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Thumbnail Settings</CardTitle>
                <CardDescription>
                  Configure thumbnail generation options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Settings className="h-8 w-8 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Advanced Settings</h4>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Thumbnail configuration settings will be available in a
                      future update. This will include options for thumbnail
                      sizes, quality settings, and caching preferences.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

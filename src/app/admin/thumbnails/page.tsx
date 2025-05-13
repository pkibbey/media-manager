'use client';

import { Image, RefreshCw, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import useContinuousProcessing from '@/hooks/useContinuousProcessing';

interface ThumbnailStatsType {
  total: number;
  processed: number;
  remaining: number;
  percentComplete: number;
}

export default function ThumbnailAdminPage() {
  const [thumbnailStats, setThumbnailStats] =
    useState<ThumbnailStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch thumbnail stats on page load
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getThumbnailStats();

        if (response.stats) {
          setThumbnailStats(response.stats);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (e) {
        setError('Failed to load thumbnail statistics');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Action for refreshing stats
  const refreshStats = async () => {
    try {
      const response = await getThumbnailStats();

      if (response.stats) {
        setThumbnailStats(response.stats);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh stats');
      console.error(e);
    }
  };

  // Original refreshStats for action button use
  const refreshStatsWithResult = async () => {
    const response = await getThumbnailStats();

    if (response.stats) {
      setThumbnailStats(response.stats);
      return { success: true };
    }

    return { success: false, error: response.error };
  };

  const resetThumbnailData = async () => {
    const { error, count } = await deleteThumbnailData();

    if (error) {
      console.error('Error resetting thumbnail data:', error);
      return { success: false, error: String(error) };
    }

    if (count) {
      setThumbnailStats((prev: any) => ({
        ...prev,
        processed: prev.processed - count,
        remaining: prev.remaining + count,
      }));
    }

    // Refresh stats after resetting
    await refreshStats();

    return { success: true, message: `Reset ${count} thumbnails` };
  };

  // Use the continuous processing hook
  const {
    batchSize,
    setBatchSize,
    isContinuousProcessing,
    processSingleBatch,
    processAllRemaining,
    stopProcessing,
  } = useContinuousProcessing({
    processBatchFn: processBatchThumbnails,
    hasRemainingItemsFn: () => (thumbnailStats?.remaining || 0) > 0,
    onBatchComplete: refreshStats,
    getTotalRemainingItemsFn: () => thumbnailStats?.remaining || 0, // Added
  });

  // Process a single batch with proper return format for ActionButton
  const processBatch = async () => {
    const result = await processSingleBatch();
    return {
      success: result.success,
      message: result.data?.processed
        ? `Generated ${result.data.processed} thumbnails`
        : result.message,
      error: result.error,
    };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Thumbnail Management</h2>
            <p className="text-muted-foreground">
              Create and manage optimized thumbnails for media files
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
                  Details about the thumbnail generation process
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
                          <div>
                            Items with Thumbnails: {thumbnailStats.processed}
                          </div>
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
                        Thumbnails provide optimized preview images for media
                        files, enhancing browsing performance while maintaining
                        visual quality. The system generates consistent
                        thumbnails for both images and videos using Sharp and
                        ffmpeg.
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
                <CardTitle>Generate Thumbnails</CardTitle>
                <CardDescription>
                  Create thumbnails for unprocessed media files
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
                      max="10"
                      value={batchSize}
                      onChange={(e) =>
                        setBatchSize(Number.parseInt(e.target.value) || 10)
                      }
                      className="max-w-[120px]"
                    />
                    <span className="text-sm text-muted-foreground">
                      Number of thumbnails to generate in a single batch
                    </span>
                  </div>
                </div>

                {thumbnailStats?.remaining === 0 ? (
                  <Alert>
                    <AlertTitle>No items to process</AlertTitle>
                    <AlertDescription>
                      All media items have thumbnails generated.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {thumbnailStats?.remaining} items remaining to be processed
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <ActionButton
                  action={processBatch}
                  disabled={
                    thumbnailStats?.remaining === 0 || isContinuousProcessing
                  }
                  loadingMessage="Generating thumbnails..."
                  successMessage="Thumbnails generated successfully"
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
                  Reset All Thumbnails
                </ActionButton>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Information</CardTitle>
                <CardDescription>
                  How thumbnail generation works
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    Thumbnail generation uses the <code>sharp</code> library for
                    images and <code>fluent-ffmpeg</code> for videos. The
                    system:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Identifies media items without thumbnails</li>
                    <li>
                      Creates optimized Jpeg thumbnails with consistent
                      dimensions
                    </li>
                    <li>For videos, extracts representative frames</li>
                    <li>
                      Stores thumbnails in Supabase Storage with optimized
                      settings
                    </li>
                    <li>
                      Updates the database with thumbnail URLs and metadata
                    </li>
                  </ul>
                </div>
              </CardContent>
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
                      Thumbnail settings will be available in a future update.
                      This will include options for thumbnail sizes, quality
                      settings, and format options.
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

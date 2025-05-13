'use client';

import { FileImage, RefreshCw, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import deleteExifData from '@/actions/exif/delete-exif-data';
import { getExifStats } from '@/actions/exif/get-exif-stats';
import { processBatchExif } from '@/actions/exif/process-batch-exif';
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

export default function ExifAdminPage() {
  const [exifStats, setExifStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch EXIF stats on page load
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getExifStats();

        if (response.stats) {
          setExifStats(response.stats);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (e) {
        setError('Failed to load EXIF statistics');
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
      const response = await getExifStats();

      if (response.stats) {
        setExifStats(response.stats);
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
    const response = await getExifStats();

    if (response.stats) {
      setExifStats(response.stats);
      return { success: true };
    }

    return { success: false, error: response.error };
  };

  const resetExifData = async () => {
    const { error, count } = await deleteExifData();

    if (error) {
      console.error('Error resetting EXIF data:', error);
      return { success: false, error: error.message };
    }
    if (count) {
      setExifStats((prev: any) => ({
        ...prev,
        total: prev.total - count,
        processed: prev.processed - count,
        remaining: prev.remaining + count,
      }));
    }

    // Refresh stats after resetting
    await refreshStats();

    return { success: true, error: `Reset ${count} EXIF data items` };
  };

  // Use the new continuous processing hook
  const {
    batchSize,
    setBatchSize,
    isContinuousProcessing,
    processSingleBatch,
    processAllRemaining,
    stopProcessing,
  } = useContinuousProcessing({
    processBatchFn: processBatchExif,
    hasRemainingItemsFn: () => (exifStats?.remaining || 0) > 0,
    onBatchComplete: refreshStats,
    getTotalRemainingItemsFn: () => exifStats?.remaining || 0, // Added
  });

  // Process a single batch with proper return format for ActionButton
  const processBatch = async () => {
    const result = await processSingleBatch();
    return {
      success: result.success,
      message: result.data?.processed
        ? `Processed ${result.data.processed} items`
        : result.message,
      error: result.error,
    };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">EXIF Data Processing</h2>
            <p className="text-muted-foreground">
              Extract and manage image metadata from media files
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
          title="EXIF Processing Status"
          total={exifStats?.total || 0}
          processed={exifStats?.processed || 0}
          isLoading={isLoading}
          icon={<FileImage className="h-4 w-4" />}
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
                <CardTitle>EXIF Data Overview</CardTitle>
                <CardDescription>
                  Details about EXIF data extraction process
                </CardDescription>
              </CardHeader>
              <CardContent>
                {exifStats ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Processing Status</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div>Total Media Items: {exifStats.total}</div>
                          <div>Processed Items: {exifStats.processed}</div>
                          <div>Remaining Items: {exifStats.remaining}</div>
                          <div>Completion: {exifStats.percentComplete}%</div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium mb-2">
                        About EXIF Processing
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        EXIF data provides valuable information about images,
                        including camera settings, timestamps, GPS coordinates,
                        and other technical details. The system extracts this
                        metadata to enhance searchability and organization of
                        your media collection.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    {isLoading
                      ? 'Loading EXIF data...'
                      : 'No EXIF data available'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Process EXIF Data</CardTitle>
                <CardDescription>
                  Extract metadata from unprocessed media files
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

                {exifStats?.remaining === 0 ? (
                  <Alert>
                    <AlertTitle>No items to process</AlertTitle>
                    <AlertDescription>
                      All media items have been processed for EXIF data.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {exifStats?.remaining} items remaining to be processed
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <ActionButton
                  action={processBatch}
                  disabled={
                    exifStats?.remaining === 0 || isContinuousProcessing
                  }
                  loadingMessage="Processing EXIF data..."
                  successMessage="EXIF data processed successfully"
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
                    disabled={exifStats?.remaining === 0}
                    loadingMessage="Processing all items..."
                    successMessage="All items processed successfully"
                    variant="secondary"
                  >
                    Process All Remaining
                  </ActionButton>
                )}
                <ActionButton
                  action={resetExifData}
                  variant="destructive"
                  disabled={isContinuousProcessing}
                  loadingMessage="Resetting EXIF data..."
                  successMessage="EXIF data reset successfully"
                >
                  Reset Exif Data
                </ActionButton>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Information</CardTitle>
                <CardDescription>
                  How EXIF data extraction works
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    EXIF data extraction uses the <code>sharp</code> library to
                    efficiently extract metadata without decoding the full
                    image. The system:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Identifies unprocessed media items</li>
                    <li>Extracts raw EXIF data using Sharp and ExifReader</li>
                    <li>
                      Normalizes timestamps, GPS coordinates, and technical
                      values
                    </li>
                    <li>
                      Stores structured data for searching and organization
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>EXIF Processing Settings</CardTitle>
                <CardDescription>
                  Configure EXIF data extraction options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Settings className="h-8 w-8 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Advanced Settings</h4>
                    <p className="text-sm text-muted-foreground max-w-md">
                      EXIF processing settings will be available in a future
                      update. This will include options for location processing,
                      timestamp correction, and specific metadata handling.
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

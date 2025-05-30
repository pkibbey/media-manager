'use client';

import { FileImage } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type DeleteResult, useAdminData } from '@/hooks/useAdminData';
import { MAX_BATCH_SIZE } from '@/lib/consts';
import { formatTime } from '@/lib/format-time';

export default function ExifAdminPage() {
  // Wrapper to match DeleteResult interface
  const deleteExifDataWrapper = async (): Promise<DeleteResult> => {
    try {
      const result = await deleteExifData();
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return {
        success: true,
        count: result.count || 0,
        message: `Reset ${result.count || 0} EXIF data items`,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  };

  const {
    data: exifStats,
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
    fetchFunction: getExifStats,
    processFunction: processBatchExif,
    deleteFunction: deleteExifDataWrapper,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">EXIF Data Processing</h2>
          <p className="text-muted-foreground">
            Extract and manage image metadata from media files
          </p>
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
                  <Label htmlFor="batch-size">Batch Size ({batchSize})</Label>
                  <div className="space-y-2">
                    <Slider
                      id="batch-size"
                      min={1}
                      max={MAX_BATCH_SIZE}
                      step={1}
                      value={[batchSize]}
                      onValueChange={(value) => setBatchSize(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Smaller</span>
                      <span>Larger</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Number of items to process in a single batch
                    </p>
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
                  action={() => processBatch()}
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
                {resetData && (
                  <ActionButton
                    action={resetData}
                    variant="destructive"
                    disabled={isContinuousProcessing}
                    loadingMessage="Resetting EXIF data..."
                    successMessage="EXIF data reset successfully"
                  >
                    Reset Exif Data
                  </ActionButton>
                )}
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
        </Tabs>
      </div>
    </AdminLayout>
  );
}

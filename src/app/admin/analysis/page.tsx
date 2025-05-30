'use client';

import { Image } from 'lucide-react';
import deleteAnalysisData from '@/actions/analysis/delete-analysis-data';
import { getAnalysisStats } from '@/actions/analysis/get-analysis-stats';
import {
  addRemainingToProcessingQueue,
  clearBasicAnalysisQueue,
  processBasicAnalysis,
} from '@/actions/analysis/process-basic-analysis';
import ActionButton from '@/components/admin/action-button';
import AdminLayout from '@/components/admin/layout';
import PauseQueueButton from '@/components/admin/pause-queue-button';
import ResetQueueButton from '@/components/admin/reset-queue-button';
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
import { useAdminData } from '@/hooks/useAdminData';
import { MAX_BATCH_SIZE } from '@/lib/consts';
import { formatTime } from '@/lib/format-time';

export default function AnalysisAdminPage() {
  const deleteAnalysisDataWrapper = async (): Promise<boolean> => {
    try {
      const result = await deleteAnalysisData();
      if (result.error) {
        return false;
      }
      return true;
    } catch (_e) {
      return false;
    }
  };

  const {
    data: analysisStats,
    isLoading,
    error,
    resetData,
    isContinuousProcessing,
    batchSize,
    setBatchSize,
    totalProcessingTime,
    estimatedTimeLeft,
    itemsProcessedThisSession,
  } = useAdminData({
    fetchFunction: getAnalysisStats,
    processFunction: processBasicAnalysis,
    deleteFunction: deleteAnalysisDataWrapper,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">AI Analysis Management</h2>
          <p className="text-muted-foreground">
            Manage AI-powered image analysis and content understanding
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <StatsCard
          title="Analysis Processing Status"
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
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Overview</CardTitle>
                <CardDescription>
                  Details about AI analysis processing and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisStats ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Processing Status</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div>Total Media Items: {analysisStats.total}</div>
                          <div>Processed Items: {analysisStats.processed}</div>
                          <div>Remaining Items: {analysisStats.remaining}</div>
                          <div>
                            Completion: {analysisStats.percentComplete}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    {isLoading
                      ? 'Loading analysis data...'
                      : 'No analysis data available'}
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
                  Process image analysis in batches
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

                {analysisStats?.remaining === 0 ? (
                  <Alert>
                    <AlertTitle>No items to process</AlertTitle>
                    <AlertDescription>
                      All media items have been processed for analysis data.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {analysisStats?.remaining} items remaining to be processed
                  </div>
                )}

                {isContinuousProcessing && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Processing Status:
                    </h4>
                    <div className="text-sm space-y-1">
                      <div>
                        Items processed this session:{' '}
                        {itemsProcessedThisSession}
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
                  action={addRemainingToProcessingQueue}
                  disabled={analysisStats?.remaining === 0}
                  loadingMessage="Processing analysis data..."
                  successMessage="Analysis data processed successfully"
                >
                  Add to processing queue
                </ActionButton>
                <ResetQueueButton
                  action={clearBasicAnalysisQueue}
                  queueName="objectAnalysisQueue"
                />
                <PauseQueueButton queueName="objectAnalysisQueue" />
                {resetData && (
                  <ActionButton
                    action={resetData}
                    variant="destructive"
                    disabled={isContinuousProcessing}
                    loadingMessage="Resetting analysis data..."
                    successMessage="Analysis data reset successfully"
                  >
                    Reset Analysis Data
                  </ActionButton>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Media Content Insights</CardTitle>
                <CardDescription>
                  Insights from AI analysis of your media collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">
                      Environment Distribution
                    </h3>
                    <div className="space-y-2">
                      <div className="text-muted-foreground">
                        No setting data available
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-2">Color Distribution</h3>
                    <div className="space-y-2">
                      <div className="text-muted-foreground">
                        No color data available
                      </div>
                    </div>
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

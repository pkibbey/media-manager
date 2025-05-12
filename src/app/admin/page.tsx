'use client';

import {
  AlertTriangle,
  Database,
  FileImage,
  FileVideo,
  HardDrive,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getStorageStats } from '@/actions/admin/get-storage-stats';
import { getAnalysisStats } from '@/actions/analysis/get-analysis-stats';
import { getExifStats } from '@/actions/exif/get-exif-stats';
import { getThumbnailStats } from '@/actions/thumbnails/get-thumbnail-stats';
import ActionButton from '@/components/admin/action-button';

import AdminLayout from '@/components/admin/layout';
import StatsCard from '@/components/admin/stats-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// We'll need to create these actions
// import { getSystemHealth } from '@/actions/admin/get-system-health';

export default function AdminOverviewPage() {
  const [analysisStats, setAnalysisStats] = useState<any>(null);
  const [exifStats, setExifStats] = useState<any>(null);
  const [thumbnailStats, setThumbnailStats] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all stats on page load
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all stats in parallel
        const [
          analysisResponse,
          exifResponse,
          thumbnailResponse,
          storageResponse,
        ] = await Promise.all([
          getAnalysisStats(),
          getExifStats(),
          getThumbnailStats(),
          getStorageStats(),
        ]);

        // Set the stats in state
        if (analysisResponse.stats) {
          setAnalysisStats(analysisResponse.stats);
        }
        if (exifResponse.stats) {
          setExifStats(exifResponse.stats);
        }
        if (thumbnailResponse?.stats) {
          setThumbnailStats(thumbnailResponse.stats);
        }
        if (storageResponse?.stats) {
          setStorageStats(storageResponse.stats);
        }
      } catch (e) {
        setError('Failed to load dashboard statistics');
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
      const [
        analysisResponse,
        exifResponse,
        thumbnailResponse,
        storageResponse,
      ] = await Promise.all([
        getAnalysisStats(),
        getExifStats(),
        getThumbnailStats(),
        getStorageStats(),
      ]);

      if (analysisResponse.stats) {
        setAnalysisStats(analysisResponse.stats);
      }
      if (exifResponse.stats) {
        setExifStats(exifResponse.stats);
      }
      if (thumbnailResponse?.stats) {
        setThumbnailStats(thumbnailResponse.stats);
      }
      if (storageResponse?.stats) {
        setStorageStats(storageResponse.stats);
      }

      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Failed to refresh stats',
      };
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <ActionButton
            action={refreshStats}
            variant="outline"
            loadingMessage="Refreshing..."
          >
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Analysis Processing"
            total={analysisStats?.total || 0}
            processed={analysisStats?.processed || 0}
            isLoading={isLoading}
            icon={<Database className="h-4 w-4" />}
          />
          <StatsCard
            title="EXIF Processing"
            total={exifStats?.total || 0}
            processed={exifStats?.processed || 0}
            isLoading={isLoading}
            icon={<FileImage className="h-4 w-4" />}
          />
          <StatsCard
            title="Thumbnail Generation"
            total={thumbnailStats?.total || 0}
            processed={thumbnailStats?.processed || 0}
            isLoading={isLoading}
            icon={<FileVideo className="h-4 w-4" />}
          />
          <StatsCard
            title="Storage Usage"
            total={100}
            processed={storageStats?.stats?.percentUsed || 0}
            isLoading={isLoading}
            icon={<HardDrive className="h-4 w-4" />}
          />
        </div>

        <Tabs defaultValue="analysis">
          <TabsList>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="exif">EXIF Data</TabsTrigger>
            <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Data</CardTitle>
                <CardDescription>Data from AI image analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {analysisStats ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Processing Status</h3>
                      <div className="text-sm">
                        <div>Total Media Items: {analysisStats.total}</div>
                        <div>Processed Items: {analysisStats.processed}</div>
                        <div>Remaining Items: {analysisStats.remaining}</div>
                        <div>Completion: {analysisStats.percentComplete}%</div>
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

          <TabsContent value="exif" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>EXIF Data</CardTitle>
                <CardDescription>
                  Metadata extraction statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {exifStats ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Processing Status</h3>
                      <div className="text-sm">
                        <div>Total Media Items: {exifStats.total}</div>
                        <div>Processed Items: {exifStats.processed}</div>
                        <div>Remaining Items: {exifStats.remaining}</div>
                        <div>Completion: {exifStats.percentComplete}%</div>
                      </div>
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

          <TabsContent value="thumbnails" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Thumbnail Generation</CardTitle>
                <CardDescription>
                  Status of thumbnail processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground">
                  Thumbnail statistics will be available soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Database and storage status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground">
                  System health monitoring will be available soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

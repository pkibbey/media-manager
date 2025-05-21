import { Database, FileImage, FileVideo, HardDrive } from 'lucide-react';
import { getStorageStats } from '@/actions/admin/get-storage-stats';
import { getAnalysisStats } from '@/actions/analysis/get-analysis-stats';
import { getExifStats } from '@/actions/exif/get-exif-stats';
import { getThumbnailStats } from '@/actions/thumbnails/get-thumbnail-stats';

import AdminLayout from '@/components/admin/layout';
import { StatsCard } from '@/components/admin/stats-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function AdminOverviewPage() {
  // Fetch all stats on the server
  const [analysisResponse, exifResponse, thumbnailResponse, storageResponse] =
    await Promise.all([
      getAnalysisStats(),
      getExifStats(),
      getThumbnailStats(),
      getStorageStats(),
    ]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Overview of system statistics and health
          </p>
        </div>

        {/* No client-side error handling, let Next.js handle errors */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Analysis"
            total={analysisResponse.stats.total || 0}
            processed={analysisResponse.stats.processed || 0}
            isLoading={false}
            icon={<Database className="h-4 w-4" />}
          />
          <StatsCard
            title="EXIF"
            total={exifResponse.stats.total || 0}
            processed={exifResponse.stats.processed || 0}
            isLoading={false}
            icon={<FileImage className="h-4 w-4" />}
          />
          <StatsCard
            title="Thumbnails"
            total={thumbnailResponse.stats.total || 0}
            processed={thumbnailResponse.stats.processed || 0}
            isLoading={false}
            icon={<FileVideo className="h-4 w-4" />}
          />
          <StatsCard
            title="Storage"
            total={100}
            processed={storageResponse.stats?.percentUsed || 0}
            isLoading={false}
            icon={<HardDrive className="h-4 w-4" />}
          />
        </div>

        <Tabs defaultValue="analysis">
          <TabsList>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="exif">EXIF Data</TabsTrigger>
            <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Data</CardTitle>
                <CardDescription>Data from AI image analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Processing Status</h3>
                    <div className="text-sm">
                      <div>
                        Total Media Items: {analysisResponse.stats.total}
                      </div>
                      <div>
                        Processed Items: {analysisResponse.stats.processed}
                      </div>
                      <div>
                        Remaining Items: {analysisResponse.stats.remaining}
                      </div>
                      <div>
                        Completion: {analysisResponse.stats.percentComplete}%
                      </div>
                    </div>
                  </div>
                </div>
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
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Processing Status</h3>
                    <div className="text-sm">
                      <div>Total Media Items: {exifResponse.stats.total}</div>
                      <div>Processed Items: {exifResponse.stats.processed}</div>
                      <div>Remaining Items: {exifResponse.stats.remaining}</div>
                      <div>
                        Completion: {exifResponse.stats.percentComplete}%
                      </div>
                    </div>
                  </div>
                </div>
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
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Processing Status</h3>
                    <div className="text-sm">
                      <div>
                        Total Media Items: {thumbnailResponse.stats.total}
                      </div>
                      <div>
                        Processed Items: {thumbnailResponse.stats.processed}
                      </div>
                      <div>
                        Remaining Items: {thumbnailResponse.stats.remaining}
                      </div>
                      <div>
                        Completion: {thumbnailResponse.stats.percentComplete}%
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

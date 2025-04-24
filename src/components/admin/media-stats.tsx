import {
  BarChartIcon,
  FileIcon,
  GearIcon,
  ImageIcon,
  PieChartIcon,
} from '@radix-ui/react-icons';
import { getDetailedMediaStats, getMediaStats } from '@/app/actions/stats';
import { formatBytes } from '@/lib/utils';

export default async function MediaStats() {
  // Fetch both basic stats and detailed stats (categories and extensions)
  const [basicStatsResult, detailedStatsResult] = await Promise.all([
    getMediaStats(),
    getDetailedMediaStats(),
  ]);

  const { success, data: stats, error } = basicStatsResult;
  const { success: detailedSuccess, data: detailedStats } = detailedStatsResult;

  if (!success || !stats) {
    return (
      <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
        Error loading statistics: {error}
      </div>
    );
  }

  // Calculate percentages for progress bars - using only non-ignored files
  const processedPercentage =
    stats.totalMediaItems > 0
      ? (stats.processedCount / stats.totalMediaItems) * 100
      : 0;

  // Function to get top 5 extensions
  const getTopExtensions = () => {
    if (!detailedSuccess || !detailedStats?.itemsByExtension) {
      return [];
    }

    return Object.entries(detailedStats.itemsByExtension)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  // Calculate total count including ignored files (for UI display)
  const totalWithIgnored = stats.totalMediaItems + stats.ignoredCount;

  // Function to get appropriate icon for a category
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'video':
        return <BarChartIcon className="h-4 w-4" />;
      case 'data':
        return <PieChartIcon className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium">Media Statistics</h3>
      </div>

      {/* Main stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-md p-4 flex flex-col">
          <div className="text-muted-foreground text-sm mb-1">Total Media</div>
          <div className="text-2xl font-bold">{stats.totalMediaItems}</div>
          <div className="text-xs text-muted-foreground">
            {totalWithIgnored} including ignored files
          </div>
        </div>
        <div className="bg-card border rounded-md p-4 flex flex-col">
          <div className="text-muted-foreground text-sm mb-1">Total Size</div>
          <div className="text-2xl font-bold">
            {formatBytes(stats.totalSizeBytes)}
          </div>
        </div>
        <div className="bg-card border rounded-md p-4 flex flex-col">
          <div className="text-muted-foreground text-sm mb-1">Processed</div>
          <div className="text-2xl font-bold">
            {stats.processedCount}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              / {stats.totalMediaItems}
            </span>
          </div>
        </div>
        <div className="bg-card border rounded-md p-4 flex flex-col">
          <div className="text-muted-foreground text-sm mb-1">
            Needs Timestamp Correction
          </div>
          <div className="text-2xl font-bold">
            {stats.needsTimestampCorrectionCount ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">
            Processed, EXIF-capable, no EXIF
          </div>
        </div>
      </div>

      {detailedSuccess && detailedStats && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Categories breakdown */}
          <div className="border rounded-md p-4 space-y-4">
            <h4 className="font-medium">Categories</h4>
            <div className="space-y-2">
              {Object.entries(detailedStats.itemsByCategory).map(
                ([category, count]) => (
                  <div key={category} className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-secondary flex items-center justify-center">
                      {getCategoryIcon(category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-xs text-muted-foreground">
                          {count} files
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full"
                          style={{
                            width: `${(count / stats.totalMediaItems) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Top extensions */}
          <div className="border rounded-md p-4 space-y-4">
            <h4 className="font-medium">Top File Types</h4>
            <div className="space-y-2">
              {getTopExtensions().map(([extension, count]) => (
                <div
                  key={extension}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <code className="px-1.5 py-0.5 rounded text-xs bg-secondary">
                      .{extension}
                    </code>
                    <span className="text-sm">{count} files</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {((count / stats.totalMediaItems) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Processing progress */}
      <div className="space-y-4 border rounded-md p-4">
        <h4 className="font-medium">Progress</h4>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <GearIcon className="h-4 w-4" />
              <span>Processing</span>
            </div>
            <span className="text-muted-foreground">
              {stats.processedCount} / {stats.totalMediaItems}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full"
              style={{ width: `${processedPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.unprocessedCount} items remaining to be processed
          </p>
        </div>
      </div>
    </div>
  );
}

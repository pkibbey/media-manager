import { GearIcon } from '@radix-ui/react-icons';
import { getAllStats } from '@/actions/stats/get-all-stats';
import { calculatePercentages, formatBytes } from '@/lib/utils';

export default async function AllMediaStats() {
  // Fetch both basic stats and detailed stats (categories and extensions)
  const { data: stats, error } = await getAllStats();

  if (error || !stats) {
    return (
      <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
        Error loading statistics: {error?.message || 'Unknown error'}
      </div>
    );
  }

  // Calculate percentages for progress bars - using only non-ignored files
  const processedPercentage = calculatePercentages({
    success: stats.totalCount - stats.failureCount,
    total: stats.totalCount,
    failed: stats.failureCount,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium">Media Statistics</h3>
      </div>

      {/* Main stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5s gap-4">
        <div className="bg-card border rounded-md p-4 flex flex-col">
          <div className="text-muted-foreground text-sm mb-1">Total Media</div>
          <div className="text-2xl font-bold">{stats.totalCount}</div>
        </div>
        <div className="bg-card border rounded-md p-4 flex flex-col">
          <div className="text-muted-foreground text-sm mb-1">Total Size</div>
          <div className="text-2xl font-bold">
            {formatBytes(stats.totalSizeBytes)}
          </div>
        </div>
      </div>

      {/* Processing progress */}
      <div className="bg-neutral-800 space-y-4 border rounded-md p-4">
        <h4 className="font-medium">Progress</h4>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <GearIcon className="h-4 w-4" />
              <span>Processing</span>
            </div>
            <span className="text-muted-foreground">
              {processedPercentage?.completed}%
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full"
              style={{ width: `${processedPercentage?.completed}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.failureCount} items errored
          </p>
        </div>
      </div>
    </div>
  );
}

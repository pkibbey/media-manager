'use client';

import {
  type FolderScanQueueStats,
  getFolderScanQueueStats,
} from '@/actions/folder-scan/get-folder-scan-queue-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  Clock,
  FolderOpen,
  Loader2,
  Pause,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function FolderScanQueueStatus() {
  const [stats, setStats] = useState<FolderScanQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const queueStats = await getFolderScanQueueStats();
        setStats(queueStats);
      } catch (error) {
        console.error('Error fetching queue stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Poll every 2 seconds for real-time updates
    const interval = setInterval(fetchStats, 2000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Folder Scan Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Queue Status Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to fetch queue statistics. Please check if the Redis
            connection is working.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Combine waiting and prioritized jobs for display (prioritized are just waiting jobs with higher priority)
  const effectiveWaiting = stats.waiting + stats.prioritized;
  const totalJobs =
    stats.active +
    effectiveWaiting +
    stats.delayed +
    stats.paused +
    stats['waiting-children'] +
    stats.completed +
    stats.failed;
  const hasActivity = totalJobs > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Folder Scan Queue Status
          {stats.active > 0 && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Active:</span>
            <span className="font-medium">{stats.active}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">Waiting:</span>
            <span className="font-medium">{effectiveWaiting}</span>
          </div>
          <div className="flex items-center gap-2">
            <Pause className="h-4 w-4 text-purple-500" />
            <span className="text-muted-foreground">Paused:</span>
            <span className="font-medium">{stats.paused}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Completed:</span>
            <span className="font-medium">{stats.completed}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Failed:</span>
            <span className="font-medium">{stats.failed}</span>
          </div>
        </div>

        {/* Progress Bar */}
        {hasActivity && stats.completed > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {stats.completed} / {totalJobs} folders processed
              </span>
            </div>
            <Progress
              value={(stats.completed / totalJobs) * 100}
              className="w-full"
            />
          </div>
        )}

        {/* Currently Processing */}
        {stats.activeJobs && stats.activeJobs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Currently Processing:</h4>
            <div className="space-y-1">
              {stats.activeJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded-md"
                >
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500 flex-shrink-0" />
                  <span className="truncate font-mono text-xs">
                    {job.data.folderPath}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasActivity && (
          <div className="text-center py-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No folders in scan queue. Add folders above to start scanning.
            </p>
          </div>
        )}

        {/* Dynamic Growth Indicator */}
        {effectiveWaiting > 0 && stats.active > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
              <div
                className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"
                style={{ animationDelay: '0.2s' }}
              />
              <div
                className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
            <span>Queue growing as subdirectories are discovered...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

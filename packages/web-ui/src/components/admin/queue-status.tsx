'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  type LucideIcon,
  Pause,
  Timer,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { QueueName, QueueStats } from 'shared/types';

interface QueueStatusProps {
  queueName: QueueName;
  title: string;
  icon: LucideIcon;
  fetchStats: () => Promise<QueueStats>;
  renderActiveJob?: (job: {
    id: string;
    data: Record<string, any>;
    progress?: number;
  }) => React.ReactNode;
  emptyStateDescription?: string;
  dynamicGrowthMessage?: string;
  showDynamicGrowth?: boolean;
}

export function QueueStatus({
  queueName,
  title,
  icon: Icon,
  fetchStats,
  renderActiveJob,
  emptyStateDescription = 'No items in queue.',
  dynamicGrowthMessage,
  showDynamicGrowth = false,
}: QueueStatusProps) {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatsData = async () => {
      try {
        const queueStats = await fetchStats();
        setStats(queueStats);
      } catch (error) {
        console.error(`Error fetching ${queueName} stats:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStatsData();

    // Poll every 2 seconds for real-time updates
    const interval = setInterval(fetchStatsData, 2000);

    return () => clearInterval(interval);
  }, [queueName, fetchStats]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
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
          <Icon className="h-5 w-5" />
          {title}
          {stats.active > 0 && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
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
                {stats.completed} / {totalJobs} items processed
              </span>
            </div>
            <Progress
              value={(stats.completed / totalJobs) * 100}
              className="w-full"
            />
          </div>
        )}

        {/* Enhanced Metrics */}
        {stats.metrics && hasActivity && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Metrics
            </h4>

            {/* Processing Rate and Time Estimates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-muted-foreground">Processing Rate</div>
                  <div className="font-medium">
                    {formatRate(stats.metrics.processingRate)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                <Timer className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-muted-foreground">
                    Est. Time Remaining
                  </div>
                  <div className="font-medium">
                    {formatDuration(stats.metrics.estimatedTimeRemaining)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                <Clock className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-muted-foreground">
                    Avg. Processing Time
                  </div>
                  <div className="font-medium">
                    {formatDuration(stats.metrics.averageProcessingTime)}
                  </div>
                </div>
              </div>

              {stats.metrics.errorRate > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="text-muted-foreground">Error Rate</div>
                    <div className="font-medium text-red-600">
                      {formatPercentage(stats.metrics.errorRate)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Performance Metrics */}
            {(stats.metrics.medianProcessingTime > 0 ||
              stats.metrics.p95ProcessingTime > 0) && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Processing Time Distribution
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="text-center p-2 bg-muted/10 rounded">
                    <div className="text-muted-foreground">Median</div>
                    <div className="font-medium">
                      {formatDuration(stats.metrics.medianProcessingTime)}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-muted/10 rounded">
                    <div className="text-muted-foreground">95th %ile</div>
                    <div className="font-medium">
                      {formatDuration(stats.metrics.p95ProcessingTime)}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-muted/10 rounded">
                    <div className="text-muted-foreground">99th %ile</div>
                    <div className="font-medium">
                      {formatDuration(stats.metrics.p99ProcessingTime)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Concurrency and Efficiency Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {stats.metrics.currentConcurrency > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                  <Activity className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="text-muted-foreground">Concurrency</div>
                    <div className="font-medium">
                      {stats.metrics.currentConcurrency} /{' '}
                      {stats.metrics.maxConcurrency}
                    </div>
                  </div>
                </div>
              )}

              {stats.metrics.queueEfficiency > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <div>
                    <div className="text-muted-foreground">
                      Queue Efficiency
                    </div>
                    <div className="font-medium">
                      {formatPercentage(stats.metrics.queueEfficiency)}
                    </div>
                  </div>
                </div>
              )}

              {stats.metrics.retryRate > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <div>
                    <div className="text-muted-foreground">Retry Rate</div>
                    <div className="font-medium">
                      {formatPercentage(stats.metrics.retryRate)}
                    </div>
                  </div>
                </div>
              )}

              {stats.metrics.stalledJobs > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                  <Pause className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="text-muted-foreground">Stalled Jobs</div>
                    <div className="font-medium text-red-600">
                      {stats.metrics.stalledJobs}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Statistics */}
            {(stats.metrics.throughputLast5Min > 0 ||
              stats.metrics.throughputLast1Hour > 0) && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  Throughput: {stats.metrics.throughputLast5Min} jobs (last 5m),{' '}
                  {stats.metrics.throughputLast1Hour} jobs (last 1h)
                </div>
                {stats.metrics.queueLatency > 0 && (
                  <div>
                    Queue latency: {formatDuration(stats.metrics.queueLatency)}
                  </div>
                )}
                {stats.metrics.idleTime > 0 && (
                  <div>Idle time: {formatDuration(stats.metrics.idleTime)}</div>
                )}
                {stats.metrics.averageRetryCount > 1 && (
                  <div>
                    Avg. retries per failed job:{' '}
                    {stats.metrics.averageRetryCount.toFixed(1)}
                  </div>
                )}
              </div>
            )}
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
                  {renderActiveJob ? (
                    renderActiveJob(job)
                  ) : (
                    <span className="truncate font-mono text-xs">
                      Job ID: {job.id}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasActivity && (
          <div className="text-center py-4">
            <Icon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {emptyStateDescription}
            </p>
          </div>
        )}

        {/* Dynamic Growth Indicator */}
        {showDynamicGrowth && effectiveWaiting > 0 && stats.active > 0 && (
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
            <span>{dynamicGrowthMessage || 'Processing...'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions for formatting metrics
function formatDuration(ms: number): string {
  if (ms === 0 || !ms || !Number.isFinite(ms)) return 'N/A';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatRate(rate: number): string {
  if (rate === 0) return '0';
  if (rate < 0.1) return `${(rate * 60).toFixed(1)}/min`;
  return `${rate.toFixed(2)}/sec`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

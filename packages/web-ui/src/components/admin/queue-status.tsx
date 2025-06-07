'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueue } from '@/hooks/useQueue';
import {
  formatDuration,
  formatPercentage,
  formatRate,
} from '@/lib/queue-utils';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  type LucideIcon,
  Timer,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { QueueName, QueueStats } from 'shared/types';
import { MetricCard } from './metric-card';
import { RequeueWithMethodButton } from './requeue-with-method-button';
import { StatCard } from './stat-card';

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
  supportedMethods?: string[];
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
  supportedMethods,
}: QueueStatusProps) {
  const { stats, isLoading } = useQueue({
    queueName,
    fetchStats,
  });

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

  // Combine waiting, prioritized, and paused jobs for display
  const effectiveWaiting = stats.waiting + stats.prioritized + stats.paused;
  const effectiveCompleted = stats.completed + stats.failed;
  const totalJobs =
    stats.active +
    effectiveWaiting +
    stats.delayed +
    stats['waiting-children'] +
    effectiveCompleted;
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <StatCard
            icon={Loader2}
            iconColor="text-blue-500"
            label="Active"
            value={stats.active}
          />
          <StatCard
            icon={Clock}
            iconColor="text-yellow-500"
            label="Waiting"
            value={effectiveWaiting}
          />
          <StatCard
            icon={CheckCircle2}
            iconColor="text-green-500"
            label="Complete"
            value={stats.completed}
          />
          <StatCard
            icon={XCircle}
            iconColor="text-red-500"
            label="Failed"
            value={stats.failed}
          />
        </div>

        {/* Requeue Functionality */}
        {supportedMethods &&
          supportedMethods.length > 0 &&
          (stats.failed > 0 || stats.completed > 0) && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <RequeueWithMethodButton
                  queueName={queueName}
                  supportedMethods={supportedMethods}
                />
              </div>
            </div>
          )}

        {/* Progress Bar */}
        {hasActivity && effectiveCompleted > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {Math.floor((effectiveCompleted / totalJobs) * 10000) / 100}%
                processed
              </span>
            </div>
            <Progress
              value={(effectiveCompleted / totalJobs) * 100}
              className="w-full"
            />
          </div>
        )}

        {/* Enhanced Metrics */}
        {stats.metrics && effectiveWaiting > 0 && hasActivity && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Metrics
            </h4>

            {/* Processing Rate and Time Estimates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <MetricCard
                icon={TrendingUp}
                iconColor="text-green-500"
                label="Processing"
                value={formatRate(stats.metrics.processingRate)}
              />
              <MetricCard
                icon={Timer}
                iconColor="text-blue-500"
                label="Remaining"
                value={formatDuration(stats.metrics.estimatedTimeRemaining)}
              />
              <MetricCard
                icon={Clock}
                iconColor="text-purple-500"
                label="Average"
                value={formatDuration(stats.metrics.averageProcessingTime)}
              />
              {stats.metrics.errorRate > 0 && (
                <MetricCard
                  icon={AlertCircle}
                  iconColor="text-red-500"
                  label="Errors"
                  value={formatPercentage(stats.metrics.errorRate)}
                  className="text-red-600"
                />
              )}
            </div>
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
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Icon className="h-8 w-8 opacity-50 mx-auto mb-4" />
                <p className="text-lg font-medium">No results</p>
                <p className="text-muted-foreground">{emptyStateDescription}</p>
              </div>
            </CardContent>
          </Card>
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

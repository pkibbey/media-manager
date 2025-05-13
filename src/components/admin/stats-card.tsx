'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface StatsCardProps {
  title: string;
  total: number;
  processed: number;
  icon?: React.ReactNode;
  errorCount?: number;
  isLoading?: boolean;
  className?: string;
}

export function StatsCard({
  title,
  total,
  processed,
  icon,
  errorCount = 0,
  isLoading = false,
  className = '',
}: StatsCardProps) {
  // Calculate statistics
  const remaining = Math.max(0, total - processed);
  const percentComplete = total > 0 ? Math.round((processed / total) * 100) : 0;
  const hasErrors = errorCount > 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse">
              Loading...
            </span>
          ) : (
            <>
              {processed} / {total}
            </>
          )}
        </div>

        <Progress value={percentComplete} className="h-2 mt-2" />

        <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Remaining:</span> {remaining}
          </div>
          <div>
            <span className="font-medium">Complete:</span> {percentComplete}%
          </div>
          {hasErrors && (
            <div className="col-span-2 text-destructive">
              <span className="font-medium">Errors:</span> {errorCount}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

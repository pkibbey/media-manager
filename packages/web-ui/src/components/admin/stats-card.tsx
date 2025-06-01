'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface StatsCardProps {
  title: string;
  total: number;
  processed: number;
  icon?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function StatsCard({
  title,
  total,
  processed,
  icon,
  isLoading = false,
  className = '',
}: StatsCardProps) {
  // Calculate statistics
  const percentComplete = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="px-4">
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
      </CardContent>
    </Card>
  );
}

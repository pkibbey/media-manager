'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InfoCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  description?: string;
  color?: 'default' | 'success' | 'warning' | 'error';
}

export function InfoCard({
  title,
  value,
  icon,
  isLoading = false,
  className = '',
  description,
  color = 'default',
}: InfoCardProps) {
  // Determine text color based on variant
  const colorClasses = {
    default: '',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="px-4">
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse">
              Loading...
            </span>
          ) : (
            value
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

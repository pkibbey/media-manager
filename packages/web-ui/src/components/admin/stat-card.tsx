import { formatShortNumber } from '@/lib/format-short-number';
import type { LucideIcon } from 'lucide-react';
import type { QueueName, QueueState } from 'shared/types';
import { EmptyQueueButton } from './empty-queue-button';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  state: QueueState;
  value: number;
  queueName: QueueName;
}

/**
 * Reusable card component for displaying queue statistics with optional reset functionality
 */
export function StatCard({
  icon: Icon,
  iconColor,
  state,
  queueName,
  value,
}: StatCardProps) {
  return (
    <div className="flex items-center justify-between p-2 border rounded-md">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-muted-foreground capitalize">{state}:</span>
        <span className="font-medium">{formatShortNumber(value)}</span>
      </div>
      {/* Queue Management */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <EmptyQueueButton queueName={queueName} state={state} />
        </div>
      </div>
    </div>
  );
}

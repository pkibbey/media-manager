import { formatShortNumber } from '@/lib/format-short-number';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: number;
}

/**
 * Reusable card component for displaying queue statistics with optional reset functionality
 */
export function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
}: StatCardProps) {
  return (
    <div className="flex items-center justify-between p-2 border rounded-md">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{formatShortNumber(value)}</span>
      </div>
    </div>
  );
}

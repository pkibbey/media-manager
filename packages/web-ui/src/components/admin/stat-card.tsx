import { Button } from '@/components/ui/button';
import { formatShortNumber } from '@/lib/format-short-number';
import { type LucideIcon, RotateCcw } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: number;
  onReset?: () => void;
  resetTitle?: string;
}

/**
 * Reusable card component for displaying queue statistics with optional reset functionality
 */
export function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  onReset,
  resetTitle,
}: StatCardProps) {
  return (
    <div className="flex items-center justify-between p-2 border rounded-md">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{formatShortNumber(value)}</span>
      </div>
      {value > 0 && onReset && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onReset}
          title={resetTitle}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

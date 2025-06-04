import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  className?: string;
}

/**
 * Reusable card component for displaying performance metrics
 */
export function MetricCard({
  icon: Icon,
  iconColor,
  label,
  value,
  className = '',
}: MetricCardProps) {
  return (
    <div
      className={`flex items-center gap-2 p-2 bg-muted/20 rounded-md ${className}`}
    >
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <div>
        <div className="text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

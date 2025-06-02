'use client';

interface DetailFieldProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function DetailField({ label, value, className }: DetailFieldProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <div className="mt-1">{value}</div>
    </div>
  );
}

import { Button } from '@/components/ui/button';

type FilterSummaryProps = {
  totalCount: number;
  onReset: () => void;
};

export function FilterSummary({ totalCount, onReset }: FilterSummaryProps) {
  return (
    <div className="flex items-center justify-between pt-2 border-t">
      <div className="text-sm text-muted-foreground">
        {totalCount > 0 ? (
          <>Showing {totalCount} items</>
        ) : (
          <>No items match your criteria</>
        )}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onReset}>
        Reset Filters
      </Button>
    </div>
  );
}

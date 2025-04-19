'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProcessingTimeEstimator } from '../processing-time-estimator';

export interface RetryItem {
  id: string;
  error?: string | null;
  [key: string]: any;
}

export interface ItemCategory {
  type: string;
  count: number;
  examples: RetryItem[];
}

export interface RetryProcessorProps<T extends RetryItem> {
  title: string;
  description: string;
  items: T[];
  totalCount?: number;
  categories?: ItemCategory[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onRetry: (
    selectedIds: string[],
    options?: any,
  ) => Promise<{
    success: boolean;
    processedCount?: number;
    successCount?: number;
    error?: string;
    [key: string]: any;
  }>;
  renderTableHeader?: () => React.ReactNode;
  renderTableRow?: (
    item: T,
    isSelected: boolean,
    onToggle: () => void,
  ) => React.ReactNode;
  retryOptions?: {
    label: string;
    key: string;
    defaultValue: boolean | string;
    type: 'checkbox' | 'select';
    options?: { label: string; value: string }[];
  }[];
  getItemDescription?: (item: T) => string;
  emptyMessage?: string;
}

export default function RetryProcessor<T extends RetryItem>({
  title,
  description,
  items,
  totalCount,
  categories,
  isLoading,
  onRefresh,
  onRetry,
  renderTableHeader,
  renderTableRow,
  retryOptions = [],
  getItemDescription = (item) => item.error || 'Unknown error',
  emptyMessage = 'No items found',
}: RetryProcessorProps<T>) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [startTime, setStartTime] = useState<number | undefined>();
  const [options, setOptions] = useState<Record<string, any>>({});

  // Initialize options from props
  useEffect(() => {
    const defaultOptions: Record<string, any> = {};
    retryOptions.forEach((option) => {
      defaultOptions[option.key] = option.defaultValue;
    });
    setOptions(defaultOptions);
  }, [retryOptions]);

  // Handle select all checkbox
  useEffect(() => {
    if (items.length === 0) return;

    const newSelected: Record<string, boolean> = {};
    items.forEach((item) => {
      newSelected[item.id] = selectAll;
    });
    setSelected(newSelected);
  }, [selectAll, items]);

  // Calculate selected count
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggleItemSelection = (id: string) => {
    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRetry = async () => {
    if (selectedCount === 0) {
      toast.error('No items selected to retry');
      return;
    }

    const selectedIds = Object.entries(selected)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);

    setIsProcessing(true);
    setProgress(0);
    setProcessed(0);
    setStartTime(Date.now());

    try {
      const result = await onRetry(selectedIds, options);

      if (result.success) {
        // Set the final progress based on the result
        setProcessed(result.processedCount || 0);
        setProgress(100); // Completed

        toast.success(
          `Successfully reprocessed ${result.successCount} of ${selectedCount} items`,
        );
        // Reload the list to show updated status
        await onRefresh();
      } else {
        toast.error(`Failed to process items: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error retrying items:', error);
      toast.error('Error occurred while retrying items');
    } finally {
      setIsProcessing(false);
      setStartTime(undefined);
    }
  };

  const handleOptionChange = (key: string, value: any) => {
    setOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">{title}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading || isProcessing}
        >
          Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{description}</p>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Loading items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 border rounded-md bg-muted/20">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Categories summary if provided */}
          {categories && categories.length > 0 && (
            <div className="border rounded-md p-4 bg-background">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Error Categories</h3>
                {totalCount && totalCount > items.length && (
                  <span className="text-xs text-amber-500">
                    Showing {items.length} of {totalCount} total items
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.type} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{category.type}</span>
                      <span className="text-muted-foreground">
                        {category.count} items
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="bg-primary h-full"
                        style={{
                          width: `${(category.count / (totalCount || items.length)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="selectAll"
                checked={selectAll}
                onCheckedChange={() => setSelectAll(!selectAll)}
              />
              <Label htmlFor="selectAll" className="text-sm">
                Select All ({items.length} items)
              </Label>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedCount} selected
            </div>
          </div>

          {/* Custom retry options if provided */}
          {retryOptions.length > 0 && (
            <div className="border rounded-md p-3 bg-muted/10 space-y-2">
              <h3 className="text-sm font-medium mb-2">Retry Options</h3>
              <div className="flex flex-wrap gap-4">
                {retryOptions.map((option) =>
                  option.type === 'checkbox' ? (
                    <div
                      key={option.key}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={option.key}
                        checked={Boolean(options[option.key])}
                        onCheckedChange={(checked) =>
                          handleOptionChange(option.key, checked)
                        }
                        disabled={isProcessing}
                      />
                      <Label htmlFor={option.key} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ) : (
                    <div
                      key={option.key}
                      className="flex flex-col space-y-1 w-full md:w-auto"
                    >
                      <Label htmlFor={option.key} className="text-sm">
                        {option.label}
                      </Label>
                      <select
                        id={option.key}
                        className="text-sm rounded-md border border-input px-3 py-1 bg-background"
                        value={String(options[option.key])}
                        onChange={(e) =>
                          handleOptionChange(option.key, e.target.value)
                        }
                        disabled={isProcessing}
                      >
                        {option.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* List of items */}
          <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-2 text-left font-medium" />
                  {renderTableHeader ? (
                    renderTableHeader()
                  ) : (
                    <>
                      <th className="px-4 py-2 text-left font-medium">Item</th>
                      <th className="px-4 py-2 text-left font-medium">Error</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const isItemSelected = selected[item.id] || false;
                  return renderTableRow ? (
                    renderTableRow(item, isItemSelected, () =>
                      toggleItemSelection(item.id),
                    )
                  ) : (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="px-4 py-2">
                        <Checkbox
                          checked={isItemSelected}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                      </td>
                      <td className="px-4 py-2 font-mono text-xs truncate max-w-40">
                        {typeof item === 'object' && 'name' in item
                          ? item.name
                          : item.id}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground truncate">
                        {getItemDescription(item)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Progress display during processing */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {processed} of {selectedCount} processed
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <ProcessingTimeEstimator
                isProcessing={isProcessing}
                processed={processed}
                remaining={selectedCount - processed}
                startTime={startTime}
                rateUnit="items/sec"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleRetry}
              disabled={isProcessing || selectedCount === 0}
            >
              Retry Selected ({selectedCount})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

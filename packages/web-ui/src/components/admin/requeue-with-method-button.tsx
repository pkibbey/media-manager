'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { QueueName, QueueState } from 'shared/types';

interface RequeueWithMethodButtonProps {
  queueName: QueueName;
  supportedMethods: string[];
  className?: string;
}

/**
 * Button component for requeuing items in a specific state with a new method
 */
export function RequeueWithMethodButton({
  queueName,
  supportedMethods,
  className,
}: RequeueWithMethodButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedState, setSelectedState] = useState<QueueState | ''>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  const queueStates: Array<{ value: QueueState; label: string }> = [
    { value: 'waiting', label: 'Waiting' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'delayed', label: 'Delayed' },
    { value: 'paused', label: 'Paused' },
    { value: 'waiting-children', label: 'Waiting Children' },
    { value: 'prioritized', label: 'Prioritized' },
  ];

  const handleRequeue = async () => {
    if (!selectedState || !selectedMethod) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/requeue-with-method?queueName=${queueName}&state=${selectedState}&method=${selectedMethod}`,
        {
          method: 'POST',
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log(result.message);
        console.log(`Requeued ${result.requeuedCount} items`);
      } else {
        console.error('Error requeuing items:', result.error);
      }
    } catch (error) {
      console.error('Failed to requeue items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canRequeue = selectedState && selectedMethod && !isLoading;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <RotateCcw className="h-4 w-4" />
          <div className="text-sm font-medium">Requeue with Method</div>
        </div>
        <div className="text-xs text-muted-foreground">
          Select a queue state and method to requeue all items in that state
          with the new method
        </div>
      </div>

      <div className="flex gap-2">
        <Select
          value={selectedState}
          onValueChange={(value) => setSelectedState(value as QueueState)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            {queueStates.map((state) => (
              <SelectItem key={state.value} value={state.value}>
                {state.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMethod} onValueChange={setSelectedMethod}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            {supportedMethods.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleRequeue}
          disabled={!canRequeue}
          size="sm"
          variant="outline"
        >
          {isLoading ? (
            <>
              <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              Requeuing...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Requeue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

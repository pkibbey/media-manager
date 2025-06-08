'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eraser, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { QueueName, QueueState } from 'shared/types';

interface EmptyQueueButtonProps {
  queueName: QueueName;
  className?: string;
  state: QueueState;
}

export function EmptyQueueButton({
  queueName,
  className,
  state,
}: EmptyQueueButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEmptyQueue = async () => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to empty the entire ${queueName}? This will remove ALL jobs in all states (waiting, active, completed, failed, etc.). This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/queue-reset?queueName=${queueName}&state=${state}`,
        {
          method: 'POST',
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log(result.message);
      } else {
        console.error('Error emptying queue:', result.error);
      }
    } catch (error) {
      console.error('Failed to empty queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleEmptyQueue}
      disabled={isLoading}
      variant="destructive"
      size="sm"
      className={cn(className)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Eraser className="h-4 w-4" />
      )}
    </Button>
  );
}

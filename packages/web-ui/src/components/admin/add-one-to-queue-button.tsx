'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ProcessType, QueueName } from 'shared/types';

interface AddOneToQueueButtonProps {
  queueName: QueueName;
  method: ProcessType;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  variant?: 'default' | 'destructive';
}

export function AddOneToQueueButton({
  queueName,
  method,
  icon: Icon = Plus,
  className,
  variant = 'default',
}: AddOneToQueueButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddOneToQueue = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/add-one-to-queue?queueName=${queueName}&method=${method}`,
        {
          method: 'POST',
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log(result.message);
        if (result.itemsAdded > 0) {
          console.log(`Added media item ${result.mediaId} to ${queueName}`);
        }
      } else {
        console.error('Error adding one to queue:', result.error);
      }
    } catch (error) {
      console.error('Failed to add one to queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAddOneToQueue}
      disabled={isLoading}
      className={cn(className, 'bg-blue-700 hover:bg-blue-800 cursor-pointer')}
      variant={variant}
      size="sm"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Adding one item...
        </>
      ) : (
        <>
          <Icon className="mr-2 h-4 w-4" />
          Add 1 to Queue
        </>
      )}
    </Button>
  );
}

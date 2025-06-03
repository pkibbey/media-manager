'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

interface AddToQueueButtonProps {
  queueName: string;
  displayName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function AddToQueueButton({
  queueName,
  displayName,
  icon: Icon = Plus,
  className,
}: AddToQueueButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const buttonText =
    displayName || `Add ${queueName.replace(/Queue$/, '')} to Queue`;

  const handleAddToQueue = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/add-to-queue?queueName=${queueName}`,
        {
          method: 'POST',
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log(result.message);
      } else {
        console.error('Error adding to queue:', result.error);
      }
    } catch (error) {
      console.error('Failed to add to queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAddToQueue}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Starting queue process...
        </>
      ) : (
        <>
          <Icon className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
}

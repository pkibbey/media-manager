'use client';

import { useEffect, useState } from 'react';
import ActionButton from './action-button';

interface PauseQueueButtonProps {
  queueName: string;
}

export default function PauseQueueButton({ queueName }: PauseQueueButtonProps) {
  const [isPaused, setIsPaused] = useState<boolean | null>(null);

  // Fetch pause state from API
  useEffect(() => {
    let isMounted = true;
    async function fetchPauseState() {
      try {
        const res = await fetch(
          `/api/admin/queue-paused?queueName=${queueName}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setIsPaused(data.paused);
        } else {
          if (isMounted) setIsPaused(null);
        }
      } catch {
        if (isMounted) setIsPaused(null);
      }
    }
    fetchPauseState();
    return () => {
      isMounted = false;
    };
  }, [queueName]);

  const handleTogglePause = async () => {
    try {
      const res = await fetch(
        `/api/admin/queue-paused?queueName=${queueName}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pause: !isPaused }),
        },
      );
      if (res.ok) {
        setIsPaused((prev) => !prev);
      }
    } catch (error) {
      console.error('Failed to toggle pause state:', error);
    }
  };

  return (
    <ActionButton
      action={handleTogglePause}
      variant={isPaused ? 'default' : 'outline'}
      loadingMessage={isPaused ? 'Resuming queue...' : 'Pausing queue...'}
      successMessage={isPaused ? 'Queue resumed' : 'Queue paused'}
    >
      {isPaused ? 'Resume Queue' : 'Pause Queue'}
    </ActionButton>
  );
}
